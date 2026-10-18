import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-extension-privacy',
  imports: [RouterLink],
  host: { class: 'min-h-screen bg-background block' },
  template: `
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <header class="mb-8">
        <a
          routerLink="/"
          class="mb-4 inline-flex items-center text-muted hover:text-text transition-colors"
        >
          <svg
            class="w-5 h-5 mr-2"
            aria-hidden="true"
            focusable="false"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Accueil
        </a>

        <h1 class="text-3xl font-bold text-text mb-2">
          Politique de confidentialité de l'extension Candidash
        </h1>
        <p class="text-muted">Dernière mise à jour : {{ lastUpdated }}</p>
      </header>

      <main>
        <article
          class="bg-card border border-border rounded-lg p-6 space-y-6 text-text/80 leading-relaxed"
        >
          <p>
            L'extension « Candidash — Ajout rapide », pour Chrome et Firefox, sert uniquement à
            enregistrer une offre d'emploi dans <strong>votre</strong> compte Candidash. Elle est
            éditée par Julien Nédellec. Contact :
            <a class="text-primary hover:underline" href="mailto:contact@nedellec-julien.fr"
              >contact&#64;nedellec-julien.fr</a
            >.
          </p>

          <section aria-labelledby="data-heading">
            <h2 id="data-heading" class="text-xl font-semibold text-text mb-3">Données traitées</h2>
            <ul class="list-disc ml-6 space-y-2">
              <li>
                <strong>Adresse e-mail, mot de passe et code de double authentification :</strong>
                saisis par vous à la connexion. Ils sont envoyés en HTTPS à l'API Candidash
                (api-candidash.nedellec-julien.fr) pour obtenir un jeton d'accès personnel. Le mot
                de passe n'est jamais stocké par l'extension.
              </li>
              <li>
                <strong>Jeton d'accès et adresse e-mail :</strong> conservés dans le stockage local
                du navigateur, et nulle part ailleurs, pour que vous restiez connecté.
              </li>
              <li>
                <strong>Adresse (URL) de l'offre affichée :</strong> envoyée à l'API Candidash à
                l'ouverture de l'extension, si vous êtes connecté, pour vérifier si l'offre est déjà
                dans vos candidatures. Rien n'est enregistré à cette étape.
              </li>
              <li>
                <strong
                  >Titre, entreprise, détails de l'annonce (lieu, salaire, télétravail), type de
                  contrat, statut :</strong
                >
                lus dans la page, puis envoyés à l'API Candidash uniquement quand vous cliquez sur «
                Ajouter à Candidash ».
              </li>
              <li>
                <strong>Version de l'extension :</strong> sur le site Candidash uniquement,
                l'extension signale sa présence à la page pour masquer l'invitation à l'installer.
                Rien n'est envoyé.
              </li>
            </ul>
          </section>

          <section aria-labelledby="never-heading">
            <h2 id="never-heading" class="text-xl font-semibold text-text mb-3">
              Ce que l'extension ne fait pas
            </h2>
            <ul class="list-disc ml-6 space-y-2">
              <li>Aucune mesure d'audience, aucun traceur, aucun service tiers.</li>
              <li>Aucune vente ni aucun partage de données.</li>
              <li>
                Aucun historique de navigation. Sur les sites d'offres pris en charge, la page est
                analysée localement pour afficher le badge « + » sur l'icône : rien n'est envoyé.
              </li>
            </ul>
          </section>

          <section aria-labelledby="retention-heading">
            <h2 id="retention-heading" class="text-xl font-semibold text-text mb-3">
              Conservation et suppression
            </h2>
            <p>
              « Se déconnecter » révoque le jeton côté API et efface le stockage local. Désinstaller
              l'extension efface aussi le stockage local. Les offres enregistrées restent dans votre
              compte Candidash : vous pouvez les supprimer, ou supprimer votre compte, depuis
              l'application.
            </p>
          </section>

          <section aria-labelledby="rights-heading">
            <h2 id="rights-heading" class="text-xl font-semibold text-text mb-3">Vos droits</h2>
            <p>
              Conformément au RGPD, vous pouvez demander l'accès, la rectification ou l'effacement
              de vos données en écrivant à
              <a class="text-primary hover:underline" href="mailto:contact@nedellec-julien.fr"
                >contact&#64;nedellec-julien.fr</a
              >.
            </p>
          </section>
        </article>
      </main>
    </div>
  `,
})
export class ExtensionPrivacy {
  protected readonly lastUpdated = new Date('2026-10-18').toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
