import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainer } from '@shared/ui/toast/toast-container';
import { AuthService } from '@core/services/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainer],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    // Tenter l'auto-login seulement si on a un refresh token et qu'on n'est pas déjà authentifié
    if (this.authService.checkAuthStatus() && !this.authService.isAuthenticated()) {
      this.authService.autoLogin().subscribe({
        next: () => {
          // Session restaurée avec succès
        },
        error: () => {
          // Échec de la restauration de session
        }
      });
    }
  }
}
