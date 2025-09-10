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
      <div
        class="w-full max-w-sm mx-auto px-4 py-4 sm:max-w-md sm:px-6 sm:py-6 md:max-w-4xl lg:max-w-6xl"
      >
        <div class="text-center mb-6 sm:mb-8 md:mb-12">
          <h1
            class="text-4xl font-bold mb-2 text-text transition-all duration-300 hover:scale-105 hover:brightness-110 sm:text-5xl sm:mb-3 md:text-6xl md:mb-4 lg:text-7xl"
            style="-webkit-text-stroke: 1px #10b981; -webkit-text-fill-color: var(--color-background);"
          >
            Candidash
          </h1>
          <p
            class="text-base text-muted max-w-sm mx-auto sm:text-lg sm:max-w-md md:max-w-2xl lg:text-xl"
          >
            Gérez vos candidatures efficacement
          </p>
        </div>

        <div class="w-full">
          @if (isSigninRoute()) {
            <app-signin></app-signin>
          } @else if (isSignupRoute()) {
            <app-signup></app-signup>
          }
        </div>
      </div>
    </app-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout implements OnInit {
  private readonly router = inject(Router);

  private readonly currentRoute = signal('');

  ngOnInit(): void {
    this.currentRoute.set(this.router.url);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.url);
      });
  }

  isSigninRoute(): boolean {
    return /^\/auth\/signin(\/?|\?.*)?$/.test(this.currentRoute());
  }

  isSignupRoute(): boolean {
    return /^\/auth\/signup(\/?|\?.*)?$/.test(this.currentRoute());
  }
}
