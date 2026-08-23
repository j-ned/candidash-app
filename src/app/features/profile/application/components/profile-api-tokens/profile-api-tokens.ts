import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Icon } from '@shared/ui/icon/icon';
import { Button } from '@shared/ui/button/button';
import { Toaster } from '@shared/ui/toast/service/toast';
import { ConfirmModal } from '@shared/ui/confirm-modal/confirm-modal';
import { ApiTokenGateway } from '@features/profile/domain/gateways/api-token.gateway';
import type { ApiToken, ApiTokenCreated } from '@features/profile/domain/models/api-token.model';

@Component({
  selector: 'app-profile-api-tokens',
  imports: [Icon, Button, DatePipe],
  host: {
    class: 'block bg-card border border-border rounded-md p-4 sm:rounded-lg sm:p-6',
    role: 'region',
    '[attr.aria-labelledby]': '"api-tokens-title"',
  },
  template: `
    <h2
      id="api-tokens-title"
      class="text-lg font-semibold text-text mb-4 flex items-center mt-3 sm:text-xl sm:mb-6 sm:mt-5"
    >
      <app-icon name="lucide-settings" cssClass="w-5 h-5 mr-2 sm:w-6 sm:h-6" />
      Extension navigateur
    </h2>

    <p class="text-sm text-muted mb-4">
      Génère un jeton pour connecter l'extension Chrome Candidash. Il n'est
      affiché qu'une seule fois.
    </p>

    @if (newlyCreatedToken(); as created) {
      <div
        class="mb-4 p-3 border border-primary/40 rounded bg-primary/5 space-y-2"
        role="alert"
      >
        <p class="text-sm font-medium text-text">
          Jeton créé — copie-le maintenant, il ne sera plus jamais affiché :
        </p>
        <div class="flex items-center gap-2">
          <code
            class="flex-1 text-xs sm:text-sm break-all bg-background border border-border rounded px-2 py-1"
            >{{ created.token }}</code
          >
          <button
            type="button"
            (click)="copyToken(created.token)"
            aria-label="Copier le jeton"
            class="text-muted hover:text-text transition-colors"
          >
            <app-icon name="lucide-copy" cssClass="w-4 h-4" />
          </button>
        </div>
      </div>
    }

    @if (isLoading()) {
      <p class="text-sm text-muted" role="status">Chargement...</p>
    } @else if (tokens().length === 0) {
      <p class="text-sm text-muted">Aucun jeton actif.</p>
    } @else {
      <ul class="space-y-2 mb-4">
        @for (t of tokens(); track t.id) {
          <li
            class="flex items-center justify-between gap-2 text-sm border border-border rounded px-3 py-2"
          >
            <div>
              <p class="text-text font-medium">{{ t.nomAffiche }}</p>
              <p class="text-muted text-xs">
                Créé le {{ t.createdAt | date: 'dd/MM/yyyy' }}
                @if (t.derniereUtilisation) {
                  · Utilisé le {{ t.derniereUtilisation | date: 'dd/MM/yyyy' }}
                }
              </p>
            </div>
            <button
              type="button"
              (click)="revoke(t)"
              [attr.aria-label]="'Révoquer le jeton ' + t.nomAffiche"
              class="text-error hover:text-error/80 transition-colors"
            >
              <app-icon name="lucide-trash-2" cssClass="w-4 h-4" />
            </button>
          </li>
        }
      </ul>
    }

    <app-button
      (buttonClick)="generate()"
      [isLoading]="isGenerating()"
      customClass="w-full sm:w-auto px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base"
    >
      <app-icon name="lucide-plus" cssClass="w-4 h-4 mr-2" />
      Générer un jeton
    </app-button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileApiTokens {
  private readonly apiTokenGateway = inject(ApiTokenGateway);
  private readonly toaster = inject(Toaster);
  private readonly confirmModal = inject(ConfirmModal);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tokens = signal<ApiToken[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isGenerating = signal(false);
  protected readonly newlyCreatedToken = signal<ApiTokenCreated | null>(null);

  constructor() {
    this.loadTokens();
  }

  private loadTokens(): void {
    this.isLoading.set(true);
    this.apiTokenGateway
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tokens) => {
          this.tokens.set(tokens);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.toaster.show('danger', "Impossible de charger les jetons d'API");
        },
      });
  }

  generate(): void {
    this.isGenerating.set(true);
    this.apiTokenGateway
      .create('Extension Chrome')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.isGenerating.set(false);
          this.newlyCreatedToken.set(created);
          this.tokens.update((tokens) => [created, ...tokens]);
          this.toaster.show('success', 'Jeton créé');
        },
        error: () => {
          this.isGenerating.set(false);
          this.toaster.show('danger', 'Échec de la création du jeton');
        },
      });
  }

  revoke(token: ApiToken): void {
    void this.confirmAndRevoke(token);
  }

  private async confirmAndRevoke(token: ApiToken): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Révoquer ce jeton ?',
      message: `"${token.nomAffiche}" ne pourra plus être utilisé par l'extension.`,
      confirmText: 'Révoquer',
      type: 'danger',
    });
    if (!confirmed) return;

    this.apiTokenGateway
      .revoke(token.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.tokens.update((tokens) => tokens.filter((t) => t.id !== token.id));
          if (this.newlyCreatedToken()?.id === token.id) {
            this.newlyCreatedToken.set(null);
          }
          this.toaster.show('success', 'Jeton révoqué');
        },
        error: () => this.toaster.show('danger', 'Échec de la révocation'),
      });
  }

  copyToken(token: string): void {
    void navigator.clipboard.writeText(token).then(() => {
      this.toaster.show('success', 'Jeton copié');
    });
  }
}
