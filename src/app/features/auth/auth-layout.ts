import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { Layout } from '@shared/ui/layout/layout';
import { filter, map } from 'rxjs/operators';
import { Signin } from './components/signin/signin';
import { Signup } from './components/signup/signup';

@Component({
  selector: 'app-auth-layout',
  imports: [Layout, Signin, Signup],
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
        <div class="flex justify-center w-full">
          <div class="w-full max-w-2xl">
            @if (isSigninRoute()) {
              <app-signin></app-signin>
            } @else if (isSignupRoute()) {
              <app-signup></app-signup>
            }
          </div>
        </div>
      </div>
    </app-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
  private readonly router = inject(Router);

  private readonly currentRoute = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.url),
    ),
    { initialValue: this.router.url },
  );

  isSigninRoute(): boolean {
    return /^\/auth\/signin(\/?|\?.*)?$/.test(this.currentRoute());
  }

  isSignupRoute(): boolean {
    return /^\/auth\/signup(\/?|\?.*)?$/.test(this.currentRoute());
  }
}
