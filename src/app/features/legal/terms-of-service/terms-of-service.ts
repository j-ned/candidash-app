import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-terms-of-service',
  imports: [],
  template: `
    <div class="min-h-screen bg-background">
      <div class="container mx-auto px-4 py-8 max-w-4xl">
        <!-- Header -->
        <div class="mb-8">
          <button
            type="button"
            (click)="goBack()"
            class="mb-4 flex items-center text-muted hover:text-text transition-colors"
          >
            <svg class="w-5 h-5 mr-2" stroke="currentColor" viewBox="0 0 24 24">
              <path
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Retour
          </button>

          <h1 class="text-3xl font-bold text-text mb-2">Conditions d'Utilisation</h1>
          <p class="text-muted">Dernière mise à jour : {{ lastUpdated }}</p>
        </div>

        <!-- Content -->
        <div class="prose prose-gray dark:prose-invert max-w-none">
          <div class="bg-card border border-border rounded-lg p-6 space-y-6">
            <section>
              <h2 class="text-xl font-semibold text-text mb-3">1. Objet et Champ d'Application</h2>
              <p class="text-text/80 leading-relaxed">
                Les présentes conditions d'utilisation régissent l'utilisation de l'application web
                Candidash, une plateforme de gestion des candidatures développée par Djoudj Dev. En
                accédant à notre service, vous acceptez pleinement ces conditions.
              </p>
            </section>

            <section>
              <h2 class="text-xl font-semibold text-text mb-3">2. Description du Service</h2>
              <p class="text-text/80 leading-relaxed mb-3">
                Candidash est une application web qui permet aux utilisateurs de :
              </p>
              <ul class="list-disc list-inside text-text/80 space-y-1 ml-4">
                <li>Gérer leurs candidatures d'emploi</li>
                <li>Suivre l'évolution de leurs demandes</li>
                <li>Organiser leurs recherches d'emploi</li>
                <li>Consulter des statistiques personnalisées</li>
              </ul>
            </section>

            <section>
              <h2 class="text-xl font-semibold text-text mb-3">3. Compte Utilisateur</h2>
              <div class="space-y-3 text-text/80">
                <p>
                  <strong>Création de compte :</strong> L'inscription est gratuite et nécessite une
                  adresse email valide.
                </p>
                <p>
                  <strong>Responsabilités :</strong> Vous êtes responsable de la confidentialité de
                  vos identifiants de connexion.
                </p>
                <p>
                  <strong>Utilisation autorisée :</strong> Votre compte est strictement personnel et
                  ne peut être partagé.
                </p>
              </div>
            </section>

            <section>
              <h2 class="text-xl font-semibold text-text mb-3">4. Protection des Données</h2>
              <div class="space-y-3 text-text/80">
                <p>
                  <strong>Cookies d'authentification :</strong> Nous utilisons des cookies sécurisés
                  (HttpOnly) pour maintenir votre session de connexion. Ces cookies sont strictement
                  nécessaires au fonctionnement du service et sont exempts de consentement selon le
                  RGPD.
                </p>
                <p>
                  <strong>Données personnelles :</strong> Vos données sont traitées conformément au
                  RGPD. Elles ne sont jamais partagées avec des tiers à des fins commerciales.
                </p>
                <p>
                  <strong>Sécurité :</strong> Nous mettons en œuvre des mesures de sécurité avancées
                  pour protéger vos données (chiffrement, tokens sécurisés, etc.).
                </p>
              </div>
            </section>

            <section>
              <h2 class="text-xl font-semibold text-text mb-3">5. Utilisation Acceptable</h2>
              <div class="space-y-3 text-text/80">
                <p>Il est interdit d'utiliser le service pour :</p>
                <ul class="list-disc list-inside space-y-1 ml-4">
                  <li>Toute activité illégale ou frauduleuse</li>
                  <li>Tenter de compromettre la sécurité du système</li>
                  <li>Créer de faux comptes ou usurper l'identité d'autrui</li>
                  <li>Surcharger nos serveurs par des requêtes automatisées</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 class="text-xl font-semibold text-text mb-3">6. Propriété Intellectuelle</h2>
              <p class="text-text/80 leading-relaxed">
                L'application Candidash, son code source, son design et ses fonctionnalités sont la
                propriété de Djoudj Dev. Vous disposez d'un droit d'utilisation personnel et
                non-exclusif du service.
              </p>
            </section>

            <section>
              <h2 class="text-xl font-semibold text-text mb-3">7. Limitation de Responsabilité</h2>
              <div class="space-y-3 text-text/80">
                <p>
                  Le service est fourni "en l'état". Nous nous efforçons d'assurer une disponibilité
                  optimale mais ne garantissons pas :
                </p>
                <ul class="list-disc list-inside space-y-1 ml-4">
                  <li>Un fonctionnement ininterrompu du service</li>
                  <li>L'absence totale d'erreurs ou de bugs</li>
                  <li>La compatibilité avec tous les navigateurs ou appareils</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 class="text-xl font-semibold text-text mb-3">8. Résiliation</h2>
              <div class="space-y-3 text-text/80">
                <p>
                  <strong>Par l'utilisateur :</strong> Vous pouvez supprimer votre compte à tout
                  moment depuis vos paramètres.
                </p>
                <p>
                  <strong>Par Candidash :</strong> Nous nous réservons le droit de suspendre ou
                  supprimer un compte en cas de violation de ces conditions.
                </p>
              </div>
            </section>

            <section>
              <h2 class="text-xl font-semibold text-text mb-3">9. Modifications</h2>
              <p class="text-text/80 leading-relaxed">
                Ces conditions peuvent être modifiées à tout moment. Les utilisateurs seront
                informés des changements significatifs par email ou notification dans l'application.
              </p>
            </section>

            <section>
              <h2 class="text-xl font-semibold text-text mb-3">10. Contact</h2>
              <div class="space-y-2 text-text/80">
                <p>Pour toute question concernant ces conditions d'utilisation :</p>
                <p><strong>Email :</strong> contact&#64;djoudj.dev</p>
                <p><strong>Développeur :</strong> Djoudj Dev</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsOfServiceComponent {
  readonly lastUpdated = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  private readonly router = inject(Router);

  goBack(): void {
    this.router.navigate(['/']);
  }
}
