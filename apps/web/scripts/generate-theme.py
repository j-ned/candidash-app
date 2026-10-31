#!/usr/bin/env python3
"""Génère src/styles.css : déclaration de la police et les deux blocs de jetons.

    python3 scripts/generate-theme.py && npx prettier --write src/styles.css

Éditer ce fichier, jamais src/styles.css à la main : une regénération l'écraserait.
Pour changer une couleur, changer sa teinte dans H ; les clartés ne bougent pas, ce qui
préserve les rapports de contraste déjà vérifiés.

Génère les deux blocs de jetons. Chaque famille est une échelle de clarté sur une teinte :
on ne change que la teinte et le chroma, jamais l'ordre des clartés, pour garder les rapports
de contraste déjà validés ailleurs dans l'application."""

# (teinte, chroma) par famille
H = {
    'primary':   (155, 0.068),   # vert forêt : couleur de marque, reprise de la page d'accueil
    'accent':    (38,  0.115),   # terracotta conservé : accent unique
    'secondary': (150, 0.022),   # sauge très désaturée : action secondaire, jamais dominante
    'success':   (142, 0.125),
    'warning':   (75,  0.120),
    'error':     (25,  0.155),
    'info':      (230, 0.110),
}
STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
# clartés du barreau, reprises telles quelles de la palette d'origine
L_LIGHT = [95, 90, 85, 80, 74, 68, 62, 56, 50, 44, 38]
# En sombre, les paliers bas servent de fonds teintés : à 38% ils devenaient des aplats
# beaucoup plus assertifs que les nuances claires équivalentes. Resserrés vers le fond.
L_DARK  = [25, 30, 36, 45, 55, 68, 74, 80, 85, 90, 95]

def ramp(fam, dark):
    h, c = H[fam]
    ls = L_DARK if dark else L_LIGHT
    # Le chroma s'atténue aux DEUX extrémités : en clair pour éviter les pastels criards, en sombre
    # parce qu'une teinte saturée à 25% de clarté vire au bloc de couleur (le terracotta devenait
    # un rouge d'alerte sur une carte au contenu neutre).
    def damp(l):
        if l >= 90 or l <= 27:
            return 0.32
        if l >= 85 or l <= 32:
            return 0.55
        if l >= 80 or l <= 38:
            return 0.8
        return 1.0

    return [(s, l, c * damp(l)) for s, l in zip(STEPS, ls)]

def fmt(l, c, h):
    return f'oklch({l:.2f}% {c:.3f} {h})'

def bloc(dark):
    o = []
    add = o.append
    # teintes neutres : papier chaud pour les fonds, encre verte pour le texte
    paper, ink, line = 95, 155, 120
    if not dark:
        add('  /* Base */')
        add(f'  --color-text: {fmt(21, 0.018, ink)};')
        add(f'  --color-background: {fmt(97.5, 0.008, paper)};')
        add(f'  --color-primary: {fmt(38, H["primary"][1], H["primary"][0])};')
        add(f'  --color-secondary: {fmt(88, H["secondary"][1], H["secondary"][0])};')
        add(f'  --color-accent: {fmt(50, H["accent"][1], H["accent"][0])};')
        add('')
        add('  /* Premier plan des surfaces colorées : introduit ici parce que bg-primary était')
        add('     associé tantôt à du texte noir, tantôt à du blanc selon les écrans. */')
        add(f'  --color-on-primary: {fmt(98, 0.005, paper)};')
        add(f'  --color-on-secondary: {fmt(21, 0.018, ink)};')
        add(f'  --color-on-accent: {fmt(98, 0.005, paper)};')
    else:
        add('  /* Base - sombre */')
        add(f'  --color-text: {fmt(95.5, 0.008, paper)};')
        add(f'  --color-background: {fmt(16.5, 0.014, ink)};')
        add(f'  --color-primary: {fmt(76, 0.098, H["primary"][0])};')
        add(f'  --color-secondary: {fmt(30, 0.025, H["secondary"][0])};')
        add(f'  --color-accent: {fmt(72, 0.105, H["accent"][0])};')
        add('')
        add('  /* Premier plan des surfaces colorées */')
        add(f'  --color-on-primary: {fmt(17, 0.020, ink)};')
        add(f'  --color-on-secondary: {fmt(95.5, 0.008, paper)};')
        add(f'  --color-on-accent: {fmt(17, 0.020, ink)};')

    # bases sémantiques : mêmes valeurs que le barreau 500/600, exposées sans suffixe
    add('')
    add('  /* Bases sémantiques. En clair : 45% et non 58%, sinon le texte des badges de statut')
    add('     (12px sur un fond teinté à 15%) reste sous le seuil AA. */')
    for fam in ['success', 'warning', 'error', 'info']:
        h, c = H[fam]
        add(f'  --color-{fam}: {fmt(45 if not dark else 72, c, h)};')

    for fam in ['primary', 'secondary', 'accent', 'success', 'warning', 'error', 'info']:
        add('')
        add(f'  /* {fam.capitalize()} */')
        for s, l, c in ramp(fam, dark):
            base = ' /* base */' if s == 500 else ''
            add(f'  --color-{fam}-{s}: {fmt(l, c, H[fam][0])};{base}')

    add('')
    add('  /* Neutres */')
    grays = [(50, 98, 0.003), (100, 95, 0.004), (200, 90, 0.006), (300, 83, 0.008), (400, 68, 0.010),
             (500, 53, 0.012), (600, 45, 0.015), (700, 35, 0.015), (800, 28, 0.016), (900, 21, 0.018), (950, 15, 0.018)]
    for s, l, c in (grays if not dark else [(s, 113 - l, c) for s, l, c in grays]):
        add(f'  --color-gray-{s}: {fmt(l, c, ink if l < 60 else paper)};')

    add('')
    add('  /* Surfaces */')
    if not dark:
        add(f'  --color-surface: {fmt(97.5, 0.008, paper)};')
        add(f'  --color-surface-100: {fmt(95.5, 0.008, paper)};')
        add(f'  --color-surface-200: {fmt(93, 0.009, paper)};')
        add(f'  --color-surface-300: {fmt(89, 0.010, paper)};')
        add('')
        add('  /* Bordures */')
        add(f'  --color-border: {fmt(88, 0.012, line)};')
        add(f'  --color-border-light: {fmt(92.5, 0.008, line)};')
        add(f'  --color-border-dark: {fmt(78, 0.014, line)};')
        add('')
        add('  /* Divers */')
        # muted passe de 68% à 45% : à 68% le texte secondaire ne passait pas AA sur fond clair
        add(f'  --color-muted: {fmt(45, 0.015, ink)};')
        add(f'  --color-muted-foreground: {fmt(38, 0.015, ink)};')
        add(f'  --color-destructive: {fmt(50, 0.155, 25)};')
        add(f'  --color-destructive-foreground: {fmt(98, 0.005, paper)};')
        add(f'  --color-popover: {fmt(99.2, 0.004, paper)};')
        add(f'  --color-popover-foreground: {fmt(21, 0.018, ink)};')
        add(f'  --color-card: {fmt(99.2, 0.004, paper)};')
        add(f'  --color-card-foreground: {fmt(21, 0.018, ink)};')
        add(f'  --color-ring: {fmt(38, 0.068, H["primary"][0])};')
        add(f'  --color-input: {fmt(88, 0.012, line)};')
    else:
        add(f'  --color-surface: {fmt(16.5, 0.014, ink)};')
        add(f'  --color-surface-100: {fmt(20.5, 0.016, ink)};')
        add(f'  --color-surface-200: {fmt(24, 0.016, ink)};')
        add(f'  --color-surface-300: {fmt(29, 0.016, ink)};')
        add('')
        add('  /* Bordures - sombre */')
        add(f'  --color-border: {fmt(29, 0.014, ink)};')
        add(f'  --color-border-light: {fmt(24, 0.012, ink)};')
        add(f'  --color-border-dark: {fmt(38, 0.016, ink)};')
        add('')
        add('  /* Divers - sombre */')
        add(f'  --color-muted: {fmt(73, 0.014, 120)};')
        add(f'  --color-muted-foreground: {fmt(80, 0.012, 120)};')
        add(f'  --color-destructive: {fmt(70, 0.135, 25)};')
        add(f'  --color-destructive-foreground: {fmt(17, 0.020, ink)};')
        add(f'  --color-popover: {fmt(20.5, 0.016, ink)};')
        add(f'  --color-popover-foreground: {fmt(95.5, 0.008, paper)};')
        add(f'  --color-card: {fmt(20.5, 0.016, ink)};')
        add(f'  --color-card-foreground: {fmt(95.5, 0.008, paper)};')
        add(f'  --color-ring: {fmt(76, 0.098, H["primary"][0])};')
        add(f'  --color-input: {fmt(29, 0.014, ink)};')
    return '\n'.join(o)

head = """@import 'tailwindcss';

/* Outfit, auto-hébergée (OFL, licence dans public/fonts/OFL.txt). Police variable : un seul
   fichier couvre toutes les graisses. font-display: swap affiche le texte immédiatement avec la
   pile système puis le remplace, donc jamais de texte invisible. Le sous-ensemble latin-ext n'est
   téléchargé que si la page contient les caractères concernés. */
@font-face {
  font-family: 'Outfit';
  font-style: normal;
  font-weight: 300 800;
  font-display: swap;
  src: url('/fonts/outfit-latin.woff2') format('woff2');
  unicode-range:
    U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
    U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Outfit';
  font-style: normal;
  font-weight: 300 800;
  font-display: swap;
  src: url('/fonts/outfit-latin-ext.woff2') format('woff2');
  unicode-range:
    U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329,
    U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F,
    U+A720-A7FF;
}

/* Palette Candidash.
   Vert forêt = marque et actions principales. Terracotta = accent unique, conservé de l'ancienne
   identité : c'est lui qui relie la page d'accueil aux captures du produit. Neutres légèrement
   verts pour l'encre, chauds pour le papier.
   Chaque famille est une échelle de clarté sur une seule teinte ; pour changer une couleur, il
   suffit de changer sa teinte dans scripts/, jamais les clartés. */

@theme {
  /* Police. La pile système reste en repli : si le woff2 ne charge pas, la mise en page tient. */
  --font-sans:
    'Outfit', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
"""
out = head + bloc(False) + '\n}\n\n[data-theme="dark"],\n.dark {\n' + bloc(True) + '\n}\n'
open('src/styles.css', 'w').write(out)

import re
names = lambda b: set(re.findall(r'--color-([a-z0-9-]+):', b))
print('jetons clair :', len(names(bloc(False))), '| sombre :', len(names(bloc(True))))
print('symétrie :', names(bloc(False)) == names(bloc(True)))
