import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/ui/button/button';
import { ProfileService } from '@features/dashboard/profile/services/profile';
import { AuthService } from '@core/services/auth';
import { UpdateProfileRequest } from '@features/dashboard/profile/models/profile-model';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile-info',
  imports: [ReactiveFormsModule, ButtonComponent, NgOptimizedImage],
  template: `
    <div class="space-y-4 sm:space-y-6">
      <div class="bg-card border border-border rounded-md p-4 sm:rounded-lg sm:p-6">
        <div
          class="mb-4 mt-2 flex flex-col gap-3 pb-3 sm:mb-6 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:pb-0"
        >
          <h2 class="text-lg font-semibold text-text flex items-center sm:text-xl">
            <img
              [ngSrc]="'/icons/about.svg'"
              alt="User Icon"
              class="w-5 h-5 mr-2 icon-invert sm:w-6 sm:h-6"
              width="18"
              height="18"
            />
            Profil
          </h2>

          <button
            type="button"
            (click)="showConfirm.set(true)"
            class="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-error/10 hover:bg-error/20 text-error text-xs font-medium border border-error/30 transition-all duration-200 self-start sm:gap-2 sm:px-3 sm:py-2 sm:rounded-md sm:text-sm"
            [disabled]="profileService.isLoading()"
            aria-label="Supprimer mon compte"
            title="Supprimer mon compte"
          >
            <img
              [ngSrc]="'/icons/warning.svg'"
              alt="Danger"
              class="w-4 h-4 sm:w-5 sm:h-5"
              width="14"
              height="14"
            />
            <span class="hidden sm:inline">Supprimer</span>
          </button>
        </div>

        <form
          [formGroup]="profileForm"
          (ngSubmit)="onUpdateProfile()"
          class="space-y-4 pt-2 sm:space-y-4 sm:pt-2"
        >
          <div class="space-y-1 sm:space-y-2">
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="Votre adresse email"
              class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background text-text placeholder:text-muted text-sm sm:px-4 sm:py-3 sm:rounded-md sm:text-base"
              [class.border-error]="isFieldInvalid('email')"
              [class.border-border]="!isFieldInvalid('email')"
            />
            @if (isFieldInvalid('email')) {
              <p class="text-error text-xs mt-1 sm:text-sm">Email invalide</p>
            }
          </div>

          <div class="space-y-1 sm:space-y-2">
            <input
              id="username"
              type="text"
              formControlName="username"
              class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background text-text placeholder:text-muted border-border text-sm sm:px-4 sm:py-3 sm:rounded-md sm:text-base"
              placeholder="Votre nom d'affichage"
            />
          </div>

          <div
            class="flex flex-col gap-1 py-2 sm:flex-row sm:justify-between sm:items-center sm:py-2"
          >
            <span class="text-muted font-medium text-sm sm:text-base"
              >Dernière mise à jour le :</span
            >
            <span class="text-text font-semibold text-sm sm:text-base">
              {{ formatDate(authService.user()?.updatedAt) }}
            </span>
          </div>

          <div class="pt-2">
            <app-button
              type="submit"
              color="primary"
              [disabled]="profileForm.invalid || profileService.isLoading()"
              [isLoading]="profileService.isLoading()"
              customClass="w-full px-4 py-2 text-sm sm:w-auto sm:px-6 sm:py-3 sm:text-base"
            >
              @if (profileService.isLoading()) {
                Sauvegarde...
              } @else {
                <span class="sm:hidden">Sauvegarder</span>
                <span class="hidden sm:inline">Sauvegarder les modifications</span>
              }
            </app-button>
          </div>
        </form>
      </div>

      @if (showConfirm()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-background/80 backdrop-blur-sm"></div>
          <div
            class="relative z-10 w-full max-w-sm mx-auto rounded-md border border-border bg-card shadow-xl sm:max-w-md sm:rounded-lg"
          >
            <div class="px-4 py-3 border-b border-border flex items-center gap-2 sm:px-5 sm:py-4">
              <img
                [ngSrc]="'/icons/warning.svg'"
                alt="Avertissement"
                class="w-6 h-6 text-error sm:w-8 sm:h-8"
                width="18"
                height="18"
              />
              <h3 class="text-lg font-semibold text-error sm:text-xl">Confirmer la suppression</h3>
            </div>
            <div class="px-4 py-3 text-text text-sm leading-relaxed sm:px-5 sm:py-4 sm:text-base">
              Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est
              irréversible.
            </div>
            <div
              class="px-4 py-3 flex flex-col gap-2 border-t border-border sm:px-5 sm:py-4 sm:flex-row sm:justify-end sm:gap-3"
            >
              <button
                type="button"
                class="px-3 py-2 rounded border border-border bg-surface text-text hover:bg-surface/80 transition-colors duration-200 text-sm sm:px-4 sm:rounded-md"
                (click)="showConfirm.set(false)"
              >
                Annuler
              </button>
              <button
                type="button"
                class="px-3 py-2 rounded bg-error text-background hover:bg-error/90 transition-colors duration-200 text-sm sm:px-4 sm:rounded-md"
                [disabled]="profileService.isLoading()"
                (click)="confirmDelete()"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileInfoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly profileService = inject(ProfileService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly showConfirm = signal(false);

  readonly profileForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    username: [''],
  });

  ngOnInit(): void {
    const user = this.authService.user();
    if (user) {
      this.profileForm.patchValue({
        email: user.email,
        username: user.username ?? '',
      });
    }
  }

  onUpdateProfile(): void {
    if (this.profileForm.valid) {
      const updateData: UpdateProfileRequest = {
        email: this.profileForm.get('email')?.value,
        username: this.profileForm.get('username')?.value ?? undefined,
      };

      this.profileService.updateProfile(updateData).subscribe();
    }
  }

  confirmDelete(): void {
    const user = this.authService.user();
    if (!user) return;

    this.profileService.deleteAccount().subscribe({
      next: () => {
        this.showConfirm.set(false);
        this.authService.signout();
        this.router.navigate(['/auth', 'login']);
      },
      error: () => {
        // nothing more to do; toast handled in service
      },
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
