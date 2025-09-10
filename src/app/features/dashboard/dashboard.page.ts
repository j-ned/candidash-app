import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button';
import { LayoutComponent } from '@shared/ui/layout/layout';

interface DashboardCard {
  id: string;
  title: string;
  value: string | number;
  description: string;
  icon: string;
  color: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: 'primary' | 'secondary' | 'accent';
  routerLink?: string;
  action?: () => void;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ButtonComponent, LayoutComponent],
  template: `
    <app-layout>
      <div class="space-y-8">
        <!-- Header Section -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 class="text-3xl font-bold text-text">Tableau de bord</h1>
            <p class="text-text/70 mt-2">Bienvenue sur votre espace candidatures</p>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          @for (card of dashboardCards(); track card.id) {
            <div
              class="bg-card border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-300"
            >
              <div class="flex items-center justify-between mb-4">
                <div
                  [class]="
                    'w-12 h-12 rounded-lg flex items-center justify-center bg-' +
                    card.color +
                    '-100'
                  "
                >
                  <i [class]="'f7-icons text-xl text-' + card.color + '-600'">{{ card.icon }}</i>
                </div>
                @if (card.trend) {
                  <div
                    [class]="
                      'flex items-center text-sm ' +
                      (card.trend.isPositive ? 'text-success' : 'text-error')
                    "
                  >
                    <i [class]="'f7-icons text-sm mr-1'">{{
                      card.trend.isPositive ? 'arrow_up' : 'arrow_down'
                    }}</i>
                    {{ card.trend.value }}%
                  </div>
                }
              </div>
              <h3 class="text-2xl font-semibold text-text mb-1">{{ card.value }}</h3>
              <p class="text-sm font-medium text-text/80 mb-2">{{ card.title }}</p>
              <p class="text-xs text-text/60">{{ card.description }}</p>
            </div>
          }
        </div>

        <!-- Quick Actions -->
        <div class="bg-card border border-gray-200 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-text mb-4">Actions rapides</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (action of quickActions(); track action.id) {
              @if (action.routerLink) {
                <a
                  [routerLink]="action.routerLink"
                  class="block p-4 border border-gray-200 rounded-lg hover:bg-surface-100 transition-colors duration-200"
                >
                  <div class="flex items-center space-x-3">
                    <div
                      [class]="
                        'w-10 h-10 rounded-lg flex items-center justify-center bg-' +
                        action.color +
                        '-100'
                      "
                    >
                      <i [class]="'f7-icons text-' + action.color + '-600'">{{ action.icon }}</i>
                    </div>
                    <span class="font-medium text-text">{{ action.label }}</span>
                  </div>
                </a>
              } @else {
                <button
                  (click)="handleQuickAction(action)"
                  class="p-4 border border-gray-200 rounded-lg hover:bg-surface-100 transition-colors duration-200 text-left w-full"
                >
                  <div class="flex items-center space-x-3">
                    <div
                      [class]="
                        'w-10 h-10 rounded-lg flex items-center justify-center bg-' +
                        action.color +
                        '-100'
                      "
                    >
                      <i [class]="'f7-icons text-' + action.color + '-600'">{{ action.icon }}</i>
                    </div>
                    <span class="font-medium text-text">{{ action.label }}</span>
                  </div>
                </button>
              }
            }
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="bg-card border border-gray-200 rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-text">Activité récente</h2>
            <app-button color="secondary" customClass="text-sm px-4 py-2"> Voir tout </app-button>
          </div>
          <div class="space-y-3">
            @for (activity of recentActivities(); track activity.id) {
              <div
                class="flex items-center space-x-3 p-3 hover:bg-surface-50 rounded-lg transition-colors duration-150"
              >
                <div
                  [class]="
                    'w-8 h-8 rounded-full flex items-center justify-center bg-' +
                    activity.type +
                    '-100'
                  "
                >
                  <i [class]="'f7-icons text-sm text-' + activity.type + '-600'">{{
                    activity.icon
                  }}</i>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-text truncate">{{ activity.title }}</p>
                  <p class="text-xs text-text/60">{{ activity.time }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </app-layout>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  private readonly router = inject(Router);

  // Dashboard statistics using signals
  private readonly rawStats = signal({
    totalApplications: 24,
    pendingApplications: 8,
    interviews: 3,
    offers: 1,
  });

  // Computed dashboard cards
  readonly dashboardCards = computed<DashboardCard[]>(() => {
    const stats = this.rawStats();
    return [
      {
        id: 'total-applications',
        title: 'Total candidatures',
        value: stats.totalApplications,
        description: 'Candidatures envoyées',
        icon: 'doc_text',
        color: 'primary',
        trend: { value: 12, isPositive: true },
      },
      {
        id: 'pending',
        title: 'En attente',
        value: stats.pendingApplications,
        description: 'Réponses attendues',
        icon: 'clock',
        color: 'warning',
        trend: { value: 5, isPositive: false },
      },
      {
        id: 'interviews',
        title: 'Entretiens',
        value: stats.interviews,
        description: 'Programmés ce mois',
        icon: 'person_2',
        color: 'accent',
        trend: { value: 50, isPositive: true },
      },
      {
        id: 'offers',
        title: 'Offres reçues',
        value: stats.offers,
        description: 'En cours de négociation',
        icon: 'star',
        color: 'success',
        trend: { value: 100, isPositive: true },
      },
    ];
  });

  // Quick actions
  readonly quickActions = signal<QuickAction[]>([
    {
      id: 'add-application',
      label: 'Nouvelle candidature',
      icon: 'plus',
      color: 'primary',
      action: () => this.handleNewApplication(),
    },
    {
      id: 'search-jobs',
      label: 'Rechercher des offres',
      icon: 'search',
      color: 'secondary',
      action: () => this.handleJobSearch(),
    },
    {
      id: 'update-profile',
      label: 'Mettre à jour le profil',
      icon: 'person',
      color: 'accent',
      action: () => this.handleProfileUpdate(),
    },
  ]);

  // Recent activities
  readonly recentActivities = signal([
    {
      id: '1',
      title: 'Candidature envoyée chez TechCorp',
      time: 'Il y a 2 heures',
      icon: 'paperplane',
      type: 'primary',
    },
    {
      id: '2',
      title: 'Entretien programmé avec StartupXYZ',
      time: 'Il y a 1 jour',
      icon: 'calendar',
      type: 'success',
    },
    {
      id: '3',
      title: 'Relance envoyée à DigitalAgency',
      time: 'Il y a 2 jours',
      icon: 'arrow_clockwise',
      type: 'warning',
    },
  ]);

  handleQuickAction(action: QuickAction): void {
    if (action.action) {
      action.action();
    }
  }

  private handleNewApplication(): void {
    console.log('Nouvelle candidature');
    // TODO: Navigate to application form or open modal
  }

  private handleJobSearch(): void {
    console.log("Recherche d'offres");
    // TODO: Navigate to job search page
  }

  private handleProfileUpdate(): void {
    console.log('Mise à jour du profil');
    // Navigate to profile page
    this.router.navigate(['/dashboard/profile']);
  }
}
