import {
  Component,
  OnInit,
  OnDestroy,
  Renderer2,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ThemeToggle } from '@shared/ui/theme-toggle/theme-toggle';
import { AuthService } from '@core/services/auth';
import { SimpleAvatarMenuComponent } from '../simple-avatar-menu/simple-avatar-menu';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-layout',
  imports: [ThemeToggle, SimpleAvatarMenuComponent, RouterLink],
  template: `
    <main
      class="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden"
    >
      <div class="absolute top-6 right-6 z-20 flex items-center space-x-3">
        @if (authService.isAuthenticated()) {
          <app-simple-avatar-menu />
        }
        <app-theme-toggle></app-theme-toggle>
      </div>

      <div class="background-grid animated-grid"></div>

      <div class="max-w-4xl mx-auto text-center space-y-8 relative z-10">
        <ng-content></ng-content>
      </div>

      <!-- Footer légal -->
      <footer class="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <a
          routerLink="/terms-of-service"
          class="text-xs text-muted hover:text-text transition-colors duration-300 hover:underline"
        >
          Conditions d'utilisation
        </a>
      </footer>
    </main>
  `,
  styles: `
    .background-grid {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      opacity: 0.25;
      z-index: 1;
      overflow: hidden;
    }

    [data-theme='dark'] .background-grid,
    .dark .background-grid {
      opacity: 0.15;
    }

    .animated-grid::before {
      content: '';
      position: absolute;
      top: -25%;
      left: -25%;
      width: 150%;
      height: 150%;
      background-image:
        linear-gradient(
          90deg,
          transparent 93%,
          var(--color-accent-950) 94%,
          var(--color-accent-900) 95%,
          var(--color-accent-950) 96%,
          transparent 97%
        ),
        linear-gradient(
          0deg,
          transparent 93%,
          var(--color-accent-950) 94%,
          var(--color-accent-900) 95%,
          var(--color-accent-950) 96%,
          transparent 97%
        ),
        linear-gradient(45deg, transparent 94%, var(--color-accent-950) 95%, transparent 96%),
        linear-gradient(-45deg, transparent 94%, var(--color-accent-950) 95%, transparent 96%);
      background-size:
        60px 60px,
        60px 60px,
        120px 120px,
        120px 120px;
      animation: modernFlow 45s ease-in-out infinite;
      filter: drop-shadow(0 0 3px var(--color-accent-500));
    }

    .animated-grid::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: /* Dynamic intersection nodes with glow */
        radial-gradient(circle at 20% 20%, var(--color-accent-300) 0%, transparent 3px),
        radial-gradient(circle at 80% 20%, var(--color-accent-500) 0%, transparent 2.5px),
        radial-gradient(circle at 20% 80%, var(--color-accent-400) 0%, transparent 3.5px),
        radial-gradient(circle at 80% 80%, var(--color-accent-600) 0%, transparent 2px),
        radial-gradient(circle at 50% 50%, var(--color-accent-300) 0%, transparent 4px),
        /* Sophisticated gradient overlay with modern depth */
          linear-gradient(
            135deg,
            transparent 0%,
            var(--color-accent-500) 25%,
            transparent 50%,
            var(--color-accent-400) 75%,
            transparent 100%
          ),
        /* Secondary overlay for visual richness */
          radial-gradient(
            ellipse at center,
            transparent 40%,
            var(--color-accent-300) 60%,
            transparent 80%
          );
      background-size:
        200px 200px,
        180px 180px,
        220px 220px,
        160px 160px,
        300px 300px,
        100% 100%,
        100% 100%;
      animation: stylishGlow 35s ease-in-out infinite alternate;
      opacity: 0.3;
      mix-blend-mode: screen;
      filter: blur(0.5px) brightness(1.1);
    }

    @keyframes modernFlow {
      0%,
      100% {
        transform: translate(0, 0) rotate(0deg) scale(1);
        opacity: 0.25;
        filter: drop-shadow(0 0 3px var(--color-accent-500)) hue-rotate(0deg);
      }
      25% {
        transform: translate(-15px, -8px) rotate(1deg) scale(1.02);
        opacity: 0.35;
        filter: drop-shadow(0 0 6px var(--color-accent-400)) hue-rotate(15deg);
      }
      50% {
        transform: translate(8px, -15px) rotate(-0.5deg) scale(0.98);
        opacity: 0.3;
        filter: drop-shadow(0 0 4px var(--color-accent-600)) hue-rotate(30deg);
      }
      75% {
        transform: translate(-8px, 8px) rotate(0.8deg) scale(1.01);
        opacity: 0.4;
        filter: drop-shadow(0 0 5px var(--color-accent-300)) hue-rotate(-15deg);
      }
    }

    @keyframes stylishGlow {
      0% {
        opacity: 0.15;
        filter: blur(1px) brightness(0.9) contrast(1.1);
        transform: scale(1) rotate(0deg);
      }
      33% {
        opacity: 0.4;
        filter: blur(0px) brightness(1.3) contrast(1.3);
        transform: scale(1.05) rotate(2deg);
      }
      66% {
        opacity: 0.25;
        filter: blur(0.5px) brightness(1.1) contrast(1.2);
        transform: scale(0.95) rotate(-1deg);
      }
      100% {
        opacity: 0.35;
        filter: blur(0.3px) brightness(1.2) contrast(1.15);
        transform: scale(1.02) rotate(1deg);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent implements OnInit, OnDestroy {
  private readonly renderer = inject(Renderer2);
  readonly authService = inject(AuthService);
  private haloElement?: HTMLElement;
  private mouseMoveListener?: (event: MouseEvent) => void;

  ngOnInit(): void {
    this.createCursorHalo();
    this.setupMouseTracking();
  }

  ngOnDestroy(): void {
    if (this.mouseMoveListener) {
      document.removeEventListener('mousemove', this.mouseMoveListener);
    }
    if (this.haloElement) {
      document.body.removeChild(this.haloElement);
    }
  }

  private createCursorHalo(): void {
    this.haloElement = this.renderer.createElement('div');
    this.renderer.addClass(this.haloElement, 'cursor-halo');
    this.renderer.appendChild(document.body, this.haloElement);
  }

  private setupMouseTracking(): void {
    this.mouseMoveListener = (event: MouseEvent) => {
      if (this.haloElement) {
        this.renderer.setStyle(this.haloElement, 'left', `${event.clientX}px`);
        this.renderer.setStyle(this.haloElement, 'top', `${event.clientY}px`);
      }
    };

    document.addEventListener('mousemove', this.mouseMoveListener);
  }
}
