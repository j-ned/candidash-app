import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { ThemeToggle } from '@shared/ui/theme-toggle/theme-toggle';

@Component({
  selector: 'app-features',
  imports: [NgOptimizedImage, ThemeToggle],
  template: `
    <div class="min-h-screen bg-background flex flex-col">
      <!-- Header simple -->
      <div class="p-6 flex items-center justify-between">
        <button
          type="button"
          (click)="goBack()"
          class="inline-flex items-center text-muted hover:text-text transition-colors"
        >
          <img
            [ngSrc]="'/icons/arrow-left.svg'"
            alt="Retour"
            class="w-5 h-5 mr-2"
            width="16"
            height="16"
          />
          Retour à l'accueil
        </button>
        <app-theme-toggle></app-theme-toggle>
      </div>

      <!-- Contenu principal centré -->
      <div class="flex-1 flex items-center justify-center px-6">
        <div class="w-full max-w-4xl mx-auto text-center space-y-8">
          <!-- Titre -->
          <div class="space-y-4">
            <h1 class="text-4xl font-bold text-text">Découvrez Candidash en action</h1>
            <p class="text-xl text-muted max-w-2xl mx-auto">
              Regardez comment notre plateforme simplifie le suivi de vos candidatures d'emploi
            </p>
          </div>

          <!-- Vidéo de démonstration -->
          <div class="relative">
            <div
              class="aspect-video bg-card border border-border rounded-xl overflow-hidden shadow-xl"
            >
              <video class="w-full h-full object-cover" controls preload="metadata" poster="">
                <source src="/video/video_feature.webm" type="video/webm" />
                <p class="text-center text-muted p-8">
                  Votre navigateur ne supporte pas la lecture de vidéos HTML5.
                  <br />
                  <a href="/video/video_feature.webm" class="text-primary hover:underline">
                    Télécharger la vidéo
                  </a>
                </p>
              </video>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA en bas -->
      <div class="p-6 text-center">
        <button
          (click)="goToSignup()"
          class="inline-flex items-center px-8 py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg"
        >
          <svg class="w-6 h-6 mr-2" stroke="currentColor" viewBox="0 0 24 24">
            <path
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Créer mon compte gratuitement
        </button>
        <p class="text-sm text-muted mt-3">Aucune carte de crédit requise</p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesComponent {
  private readonly router = inject(Router);

  goBack(): void {
    this.router.navigate(['/']);
  }

  goToSignup(): void {
    this.router.navigate(['/auth/signup']);
  }

  goToSignin(): void {
    this.router.navigate(['/auth/signin']);
  }
}
