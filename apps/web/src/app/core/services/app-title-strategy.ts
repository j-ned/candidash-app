import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const DEFAULT_TITLE = 'Candidash - Gère tes candidatures simplement !';

// Routes without a `title` fall back to the default one instead of keeping the previous page's.
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.title.setTitle(this.buildTitle(snapshot) ?? DEFAULT_TITLE);
  }
}
