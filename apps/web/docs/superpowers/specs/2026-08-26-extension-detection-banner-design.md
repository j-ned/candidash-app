# Bandeau de détection de l'extension Chrome

## Description

Candidash dispose d'une extension Chrome (`chrome-candidash-extension`) permettant d'ajouter une annonce d'emploi repérée en surfant. Les utilisateurs qui ne l'ont pas installée n'en ont pas connaissance. On ajoute un bandeau, sur la landing publique et l'espace connecté (dashboard), qui :

- annonce l'extension aux visiteurs/utilisateurs qui ne l'ont pas,
- se masque automatiquement une fois l'extension détectée comme installée,
- reste fermable manuellement (mémorisé en `localStorage`) pour ceux qui ne veulent pas l'installer,
- fonctionne dès maintenant en mode "Bientôt disponible" (l'extension n'a pas encore d'ID stable côté Chrome Web Store — pas de brouillon uploadé), et bascule automatiquement en mode "Installer" le jour où l'utilisateur renseigne l'ID en configuration, sans redeploy.

Deux repos concernés : `ng-candidash-app` (bandeau + détection) et `chrome-candidash-extension` (endpoint de détection côté extension).

## Plan technique

### Vue d'ensemble du flux

```
ng-candidash-app (page)                chrome-candidash-extension
  ExtensionBanner
    └─ ExtensionDetection.check()
         │
         │  extensionId absent OU chrome.runtime absent
         ├─────────────────────────────────► status = 'unavailable'
         │
         │  chrome.runtime.sendMessage(extensionId, {type:'PING'}, cb)
         └──────────────────────────────────►  onMessageExternal listener
                                                  (background service worker,
                                                   matches candidash.nedellec-julien.fr)
              ◄───────────────────────────────  sendResponse({ pong: true })
         status = 'installed'  (réponse reçue avant 500ms)
         status = 'not-installed'  (timeout / lastError / pas de réponse)
```

### Côté `ng-candidash-app`

**Config** (`core/services/config.ts`) — étendre `AppConfig` :
```typescript
export type AppConfig = {
  apiUrl: string;
  extensionId?: string;
};
```
Chargé depuis `/config.json` au runtime (pattern déjà en place pour `apiUrl`). Absent en prod tant qu'aucun ID n'est configuré.

**`ExtensionDetection`** (nouveau, `shared/ui/extension-banner/service/extension-detection.ts`) :
- `@Injectable({ providedIn: 'root' })`, même pattern que `Config` (garde `isPlatformBrowser` pour la sécurité SSR — l'objet global `chrome` n'existe pas côté serveur).
- État : `status = signal<'unknown' | 'checking' | 'installed' | 'not-installed' | 'unavailable'>('unknown')`.
- `check(): void` — idempotent (ne relance pas si déjà `'checking'`/résolu), appelé une fois via `afterNextRender` par le composant consommateur (pas dans le constructeur du service, pour éviter un check hors contexte d'injection de composant).
  - Si `!isBrowser || !config.extensionId || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage` → `status.set('unavailable')`, retour immédiat (pas d'appel).
  - Sinon `status.set('checking')`, puis `chrome.runtime.sendMessage(extensionId, { type: 'PING' }, callback)` couplé à un timeout de 500 ms (`Promise.race` entre la réponse et un `setTimeout` — pas de fake timers en prod, juste un délai réel court). Callback : lire `chrome.runtime.lastError` pour éviter le warning console, réponse valide (`pong === true`) → `'installed'`, sinon/timeout → `'not-installed'`.

**`ExtensionBanner`** (nouveau, `shared/ui/extension-banner/extension-banner.ts`) :
- Injecte `ExtensionDetection`, appelle `check()` dans `afterNextRender`.
- État local `dismissed = signal<boolean>(...)` initialisé depuis `localStorage.getItem('extension-banner-dismissed') === 'true'` (lecture guardée `isPlatformBrowser`, comme les autres accès navigateur du repo).
- `visible = computed(() => !dismissed() && (status() === 'unavailable' || status() === 'not-installed'))`.
- Deux variantes de contenu (`@switch` ou `@if` sur `status()`) :
  - `'unavailable'` : "Bientôt disponible sur Chrome" — pas de lien actif.
  - `'not-installed'` : "Installe l'extension Chrome" + lien `https://chromewebstore.google.com/detail/{extensionId}` (ouvre un nouvel onglet).
- Bouton × → `dismissed.set(true)` + `localStorage.setItem(...)`.
- Style : bandeau plein-largeur en haut du contenu de page (pas dans `Layout` partagé — utilisé aussi par `auth`/`profile`, hors scope), cohérent avec les tokens Tailwind existants (`bg-card`, `border-border`, etc.), `role="status"` (information non bloquante, pas une alerte).

**Placement** — `<app-extension-banner />` ajouté explicitement dans `home.ts` et `dashboard.page.ts` (import du composant standalone), pas de changement à `Layout`.

### Côté `chrome-candidash-extension`

**`manifest.config.ts`** — ajouter :
```typescript
externally_connectable: {
  matches: ['https://candidash.nedellec-julien.fr/*'],
},
background: {
  service_worker: 'src/background/index.ts',
},
```
`onMessageExternal` doit être écouté par un contexte actif en permanence — le popup ne tourne que quand il est ouvert, un content script ne reçoit pas cet event (c'est un event de `chrome.runtime`, pas de `chrome.tabs`). L'extension n'a aujourd'hui aucun `background.service_worker` : c'est un ajout nécessaire, pas une simple option.

**Nouveau fichier** `src/background/index.ts` :
```typescript
chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'PING') {
    sendResponse({ pong: true });
  }
  return true;
});
```

### Erreurs et cas limites

- Navigateur non-Chromium (Firefox, Safari) : `chrome` global absent → `status = 'unavailable'` direct, pas d'erreur.
- Extension installée mais désactivée : `sendMessage` échoue silencieusement (comportement identique à "non installée") → `'not-installed'`, comportement acceptable (rien à distinguer côté UX).
- SSR : aucun accès à `chrome`/`localStorage` côté serveur (guard `isPlatformBrowser` partout, pattern déjà utilisé par `Config`).
- Double affichage du bandeau si l'utilisateur visite home ET dashboard dans la même session : le `status` du service est mis en cache (signal root), pas de re-check ; le dismiss est en `localStorage` donc partagé entre les deux pages.

### Tests

- `ExtensionDetection` (unit, `chrome` mocké sur `window`) : pas d'`extensionId` configuré → `'unavailable'` sans appel ; `chrome` absent → `'unavailable'` ; réponse `pong` avant timeout → `'installed'` ; timeout/`lastError` → `'not-installed'`.
- `ExtensionBanner` (TestBed, `ExtensionDetection` mocké) : les 3 états visibles (`unavailable`, `not-installed`) + état caché (`installed`) ; dismiss persiste en `localStorage` et masque le bandeau au prochain rendu.
- `chrome-candidash-extension` : test du listener `onMessageExternal` (répond `{ pong: true }` sur `PING`, ignore les autres types de message).

## Points ouverts pour le plan d'implémentation

- URL exacte de la fiche Chrome Web Store une fois l'extension uploadée (format `https://chromewebstore.google.com/detail/{extensionId}` à confirmer une fois l'ID réel obtenu).
