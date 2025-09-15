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
      class="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-surface"
    >
      <div class="absolute inset-0 z-0">
        <div class="absolute inset-0 opacity-30 dark:opacity-20">
          <div
            class="absolute inset-0 bg-[linear-gradient(90deg,transparent_93%,theme(colors.accent.950)_94%,theme(colors.accent.900)_95%,theme(colors.accent.950)_96%,transparent_97%),linear-gradient(0deg,transparent_93%,theme(colors.accent.950)_94%,theme(colors.accent.900)_95%,theme(colors.accent.950)_96%,transparent_97%)] bg-[length:60px_60px] animate-pulse"
          ></div>
        </div>

        <div
          class="absolute inset-0 bg-gradient-to-r from-transparent via-accent/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite] opacity-40"
        ></div>

        <div
          class="absolute top-1/4 left-1/4 w-2 h-2 bg-accent rounded-full animate-ping opacity-60"
        ></div>
        <div
          class="absolute top-3/4 right-1/4 w-1 h-1 bg-primary rounded-full animate-ping opacity-40 animation-delay-1000"
        ></div>
        <div
          class="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-accent rounded-full animate-ping opacity-50 animation-delay-2000"
        ></div>
      </div>

      <header class="absolute top-0 left-0 right-0 z-30 p-4 sm:p-6">
        <div class="flex items-center justify-between">
          <div class="opacity-0"></div>

          <div
            class="flex items-center gap-3 backdrop-blur-sm bg-card/80 border border-border/50 rounded-2xl px-4 py-2 shadow-lg"
          >
            @if (authService.isAuthenticated()) {
              <div class="animate-in fade-in slide-in-from-right-5 duration-300">
                <app-simple-avatar-menu />
              </div>
            }
            <div class="animate-in fade-in slide-in-from-right-3 duration-500">
              <app-theme-toggle></app-theme-toggle>
            </div>
          </div>
        </div>
      </header>

      <div class="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
        <div class="w-full max-w-6xl mx-auto">
          <div
            class="relative backdrop-blur-sm bg-card/50 border border-border/30 rounded-3xl shadow-2xl shadow-primary/5 overflow-hidden"
          >
            <div
              class="absolute inset-0 rounded-3xl border border-accent/20 pointer-events-none"
            ></div>

            <div class="relative p-6 sm:p-8 lg:p-12">
              <div class="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <ng-content></ng-content>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer class="absolute bottom-0 left-0 right-0 z-10 p-4 sm:p-6">
        <div class="flex items-center justify-center">
          <div
            class="backdrop-blur-sm bg-card/60 border border-border/40 rounded-full px-6 py-2 shadow-lg"
          >
            <a
              routerLink="/terms-of-service"
              class="text-xs sm:text-sm text-muted hover:text-text transition-all duration-300 hover:scale-105 font-medium group"
            >
              <span class="group-hover:underline">Conditions d'utilisation</span>
            </a>
          </div>
        </div>
      </footer>

      <div
        class="pointer-events-none fixed inset-0 z-50 transition-opacity duration-300 opacity-0 cursor-halo"
      ></div>
    </main>
  `,
  styles: `
    @keyframes shimmer {
      0%,
      100% {
        transform: translateX(-100%);
        opacity: 0.3;
      }
      50% {
        transform: translateX(100%);
        opacity: 0.6;
      }
    }

    .animation-delay-1000 {
      animation-delay: 1s;
    }
    .animation-delay-2000 {
      animation-delay: 2s;
    }

    .cursor-halo {
      position: fixed;
      width: 20px;
      height: 20px;
      background: radial-gradient(circle, theme(colors.accent.500/20%) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      transition: all 0.1s ease-out;
      mix-blend-mode: screen;
    }

    .cursor-halo:before {
      content: '';
      position: absolute;
      top: -5px;
      left: -5px;
      right: -5px;
      bottom: -5px;
      background: radial-gradient(circle, theme(colors.primary.400/10%) 0%, transparent 60%);
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes slide-in-from-right-5 {
      from {
        transform: translateX(20px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slide-in-from-right-3 {
      from {
        transform: translateX(12px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slide-in-from-bottom-8 {
      from {
        transform: translateY(32px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @media (max-width: 640px) {
      .cursor-halo {
        display: none;
      }
    }

    @media (prefers-color-scheme: dark) {
      .cursor-halo {
        background: radial-gradient(circle, theme(colors.accent.400/15%) 0%, transparent 70%);
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
  private lastMoveTime = 0;
  private readonly cleanupListeners: (() => void)[] = [];

  ngOnInit(): void {
    this.createCursorHalo();
    this.setupMouseTracking();
  }

  ngOnDestroy(): void {
    if (this.mouseMoveListener) {
      document.removeEventListener('mousemove', this.mouseMoveListener);
    }

    this.cleanupListeners.forEach((cleanup) => cleanup());

    if (this.haloElement && document.body.contains(this.haloElement)) {
      document.body.removeChild(this.haloElement);
    }
  }

  private createCursorHalo(): void {
    this.haloElement = this.renderer.createElement('div');
    this.renderer.addClass(this.haloElement, 'cursor-halo');
    this.renderer.addClass(this.haloElement, 'fixed');
    this.renderer.addClass(this.haloElement, 'pointer-events-none');
    this.renderer.addClass(this.haloElement, 'z-50');
    this.renderer.addClass(this.haloElement, 'transition-opacity');
    this.renderer.addClass(this.haloElement, 'duration-300');
    this.renderer.addClass(this.haloElement, 'opacity-0');
    this.renderer.appendChild(document.body, this.haloElement);
  }

  private setupMouseTracking(): void {
    this.mouseMoveListener = (event: MouseEvent) => {
      if (this.haloElement) {
        this.renderer.removeClass(this.haloElement, 'opacity-0');
        this.renderer.addClass(this.haloElement, 'opacity-100');

        this.renderer.setStyle(this.haloElement, 'left', `${event.clientX}px`);
        this.renderer.setStyle(this.haloElement, 'top', `${event.clientY}px`);

        const now = Date.now();
        const timeDiff = now - (this.lastMoveTime || now);
        const speed = Math.min(
          (Math.sqrt(Math.pow(event.movementX || 0, 2) + Math.pow(event.movementY || 0, 2)) /
            Math.max(timeDiff, 1)) *
            10,
          2,
        );

        this.renderer.setStyle(
          this.haloElement,
          'transform',
          `translate(-50%, -50%) scale(${1 + speed * 0.2})`,
        );

        this.lastMoveTime = now;
      }
    };

    const mouseLeaveListener = () => {
      if (this.haloElement) {
        this.renderer.removeClass(this.haloElement, 'opacity-100');
        this.renderer.addClass(this.haloElement, 'opacity-0');
      }
    };

    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mouseleave', mouseLeaveListener);

    this.cleanupListeners.push(() =>
      document.removeEventListener('mouseleave', mouseLeaveListener),
    );
  }
}
