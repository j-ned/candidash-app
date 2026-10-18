import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Config } from '@core/services/config';
import { StoreBadges } from './store-badges';

describe('StoreBadges', () => {
  async function setup(config: {
    extensionId?: string;
    firefoxAddonUrl?: string;
  }): Promise<ComponentFixture<StoreBadges>> {
    TestBed.configureTestingModule({ providers: [{ provide: Config, useValue: config }] });
    const fixture = TestBed.createComponent(StoreBadges);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  const byTestId = <T extends HTMLElement>(fixture: ComponentFixture<StoreBadges>, id: string) =>
    fixture.nativeElement.querySelector(`[data-testid="${id}"]`) as T | null;

  it('links the official Chrome Web Store badge to the listing, in a new tab', async () => {
    // Given / When
    const fixture = await setup({ extensionId: 'abcdefghijklmnopabcdefghijklmnop' });

    // Then
    const link = byTestId<HTMLAnchorElement>(fixture, 'store-link-chrome');
    expect(link?.href).toBe(
      'https://chromewebstore.google.com/detail/abcdefghijklmnopabcdefghijklmnop',
    );
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toContain('noopener');
    const badge = link?.querySelector('img');
    expect(badge?.getAttribute('src')).toBe('/badges/chrome-web-store.png');
    expect(badge?.alt).toBe('Disponible sur le Chrome Web Store');
  });

  it('links the official Firefox badge once the add-on is listed', async () => {
    // Given / When
    const fixture = await setup({
      extensionId: 'abcdefghijklmnopabcdefghijklmnop',
      firefoxAddonUrl: 'https://addons.mozilla.org/fr/firefox/addon/candidash/',
    });

    // Then
    const link = byTestId<HTMLAnchorElement>(fixture, 'store-link-firefox');
    expect(link?.href).toBe('https://addons.mozilla.org/fr/firefox/addon/candidash/');
    expect(link?.querySelector('img')?.getAttribute('src')).toBe(
      '/badges/firefox-get-the-addon.svg',
    );
    expect(byTestId(fixture, 'store-pending-firefox')).toBeNull();
  });

  it('announces Firefox as coming soon until its listing is configured', async () => {
    // Given / When
    const fixture = await setup({ extensionId: 'abcdefghijklmnopabcdefghijklmnop' });

    // Then
    expect(byTestId(fixture, 'store-link-firefox')).toBeNull();
    expect(byTestId(fixture, 'store-pending-firefox')?.textContent).toContain('Firefox');
  });

  it('shows no Chrome badge without a published extension', async () => {
    // Given / When
    const fixture = await setup({});

    // Then
    expect(byTestId(fixture, 'store-link-chrome')).toBeNull();
    expect(byTestId(fixture, 'store-pending-chrome')?.textContent).toContain('Chrome');
  });
});
