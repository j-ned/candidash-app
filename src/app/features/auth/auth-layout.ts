import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { LayoutComponent } from '@shared/ui/layout/layout';
import { filter } from 'rxjs/operators';
import { SigninComponent } from './components/signin';
import { SignupComponent } from './components/signup';

@Component({
  selector: 'app-auth-layout',
  imports: [LayoutComponent, SigninComponent, SignupComponent],
  template: `
    <app-layout>
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-12">
          <h1 class="text-6xl font-bold mb-4 text-text custom-stroke">Candidash</h1>
          <p class="text-lg text-muted max-w-2xl mx-auto">Gérez vos candidatures efficacement</p>
        </div>

        @if (isSigninRoute()) {
          <app-signin></app-signin>
        } @else if (isSignupRoute()) {
          <app-signup></app-signup>
        }
      </div>
    </app-layout>
  `,
  styles: `
    .custom-stroke {
      -webkit-text-stroke: 2px #10b981;
      -webkit-text-fill-color: var(--color-background);
    }

    h1:hover {
      transform: scale(1.02);
      text-shadow:
        0 0 15px var(--color-accent-500),
        0 0 25px var(--color-accent-400);
      filter: brightness(1.1);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout implements OnInit {
  private readonly router = inject(Router);

  private readonly currentRoute = signal('');

  ngOnInit(): void {
    // Initialize with current URL
    this.currentRoute.set(this.router.url);

    // Listen to navigation events
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.url);
      });
  }

  isSigninRoute(): boolean {
    // Accepte /auth/signin, /auth/signin/, /auth/signin?...
    return /^\/auth\/signin(\/?|\?.*)?$/.test(this.currentRoute());
  }

  isSignupRoute(): boolean {
    // Accepte /auth/signup, /auth/signup/, /auth/signup?...
    return /^\/auth\/signup(\/?|\?.*)?$/.test(this.currentRoute());
  }
}
