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
    <div class="space-y-6">
      <div class="bg-card border border-border rounded-lg p-6">
        <div class="mb-6 mt-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-text flex items-center">
            <img
              [ngSrc]="'/icons/about.svg'"
              alt="User Icon"
              class="w-6 h-6 mr-2 icon-invert"
              width="20"
              height="20"
            />
            Informations personnelles
          </h2>

          <button
            type="button"
            (click)="showConfirm.set(true)"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-accent hover:bg-red-600 text-text text-sm font-medium border border-error/50 shadow-sm"
            [disabled]="profileService.isLoading()"
            aria-label="Supprimer mon compte"
            title="Supprimer mon compte"
          >
            <img
              [ngSrc]="'/icons/warning.svg'"
              alt="Danger"
              class="w-6 h-6"
              width="16"
              height="16"
            />
          </button>
        </div>

        <div class="flex justify-start items-center py-1">
          <div class="text-text/70 font-base ">
            <span class="text-text font-bold pl-2">Rôle :</span>
            {{ authService.user()?.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur' }}
          </div>
        </div>

        <form [formGroup]="profileForm" (ngSubmit)="onUpdateProfile()" class="space-y-6">
          <div class="space-y-2">
            <input
              id="email"
              type="email"
              formControlName="email"
              class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all bg-background text-text placeholder:text-muted-foreground"
              [class.border-error]="isFieldInvalid('email')"
              [class.border-input]="!isFieldInvalid('email')"
            />
            @if (isFieldInvalid('email')) {
              <p class="text-error text-sm mt-1">Email invalide</p>
            }
          </div>

          <div class="space-y-2">
            <input
              id="username"
              type="text"
              formControlName="username"
              class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all bg-background text-text placeholder:text-muted-foreground border-input"
              placeholder="Votre nom d'affichage"
            />
          </div>

          <div class="pt-2">
            <app-button
              type="submit"
              color="primary"
              [disabled]="profileForm.invalid || profileService.isLoading()"
              [isLoading]="profileService.isLoading()"
              customClass="w-full sm:w-auto px-6 py-3"
            >
              @if (profileService.isLoading()) {
                Sauvegarde...
              } @else {
                Sauvegarder les modifications
              }
            </app-button>
          </div>
        </form>
      </div>

      @if (showConfirm()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-background/70 backdrop-blur-sm"></div>
          <div
            class="relative z-10 w-full max-w-md mx-4 rounded-lg border border-border bg-card shadow-xl"
          >
            <div class="px-5 py-4 border-b border-border flex items-center gap-2">
              <img
                [ngSrc]="'/icons/warning.svg'"
                alt="Avertissement"
                class="w-10 h-10"
                width="20"
                height="20"
              />
              <h3 class="text-2xl font-semibold text-red-600">Confirmer la suppression</h3>
            </div>
            <div class="px-5 py-4 text-text/90 pl-4">
              Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est
              irréversible.
            </div>
            <div class="px-5 py-4 flex justify-end gap-3 border-t border-border">
              <button
                type="button"
                class="px-4 py-2 rounded-md border border-border bg-background text-text hover:bg-background/80"
                (click)="showConfirm.set(false)"
              >
                Annuler
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-md bg-error text-text hover:bg-error/80 border border-error/50"
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
}
