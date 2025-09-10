import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LayoutComponent } from '@shared/ui/layout/layout';

@Component({
  selector: 'app-settings-page',
  imports: [LayoutComponent],
  template: `
    <app-layout>
      <div class="max-w-4xl mx-auto p-4">
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">Paramètres</h1>
        <p class="mt-2 text-slate-600 dark:text-slate-300">Page des paramètres du compte.</p>
      </div>
    </app-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent {}
