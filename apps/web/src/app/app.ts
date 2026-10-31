import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { ToastContainer } from '@shared/ui/toast/toast-container';
import { AuthState } from '@features/auth/application/auth-state';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainer],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly authService = inject(AuthState);

  constructor() {
    if (this.authService.checkAuthStatus() && !this.authService.isAuthenticated()) {
      this.authService.autoLogin().pipe(takeUntilDestroyed()).subscribe();
    }
  }
}
