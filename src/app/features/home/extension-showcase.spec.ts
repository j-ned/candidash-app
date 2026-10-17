import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Config } from '@core/services/config';
import { ExtensionShowcase } from './extension-showcase';

describe('ExtensionShowcase', () => {
  async function setup(config: {
    extensionId?: string;
    firefoxAddonUrl?: string;
  }): Promise<ComponentFixture<ExtensionShowcase>> {
    TestBed.configureTestingModule({ providers: [{ provide: Config, useValue: config }] });
    const fixture = TestBed.createComponent(ExtensionShowcase);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function link(
    fixture: ComponentFixture<ExtensionShowcase>,
    store: string,
  ): HTMLAnchorElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="store-link-${store}"]`);
  }

  function pending(
    fixture: ComponentFixture<ExtensionShowcase>,
    store: string,
  ): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="store-pending-${store}"]`);
  }

  it('links both stores once their listing is configured', async () => {
    // Given / When
    const fixture = await setup({
      extensionId: 'abcdefghijklmnopabcdefghijklmnop',
      firefoxAddonUrl: 'https://addons.mozilla.org/fr/firefox/addon/candidash/',
    });

    // Then
    expect(link(fixture, 'chrome')?.href).toBe(
      'https://chromewebstore.google.com/detail/abcdefghijklmnopabcdefghijklmnop',
    );
    expect(link(fixture, 'firefox')?.href).toBe(
      'https://addons.mozilla.org/fr/firefox/addon/candidash/',
    );
    expect(link(fixture, 'chrome')?.rel).toContain('noopener');
  });

  it('announces a store as pending until its listing is configured', async () => {
    // Given / When
    const fixture = await setup({ extensionId: 'abcdefghijklmnopabcdefghijklmnop' });

    // Then
    expect(link(fixture, 'chrome')).not.toBeNull();
    expect(link(fixture, 'firefox')).toBeNull();
    expect(pending(fixture, 'firefox')?.textContent).toContain('Firefox');
  });

  it('shows the real extension popup with a descriptive alt text', async () => {
    // Given / When
    const fixture = await setup({});

    // Then
    const img: HTMLImageElement = fixture.nativeElement.querySelector(
      '[data-testid="extension-popup"]',
    );
    expect(img.getAttribute('src')).toBe('/screen/extension-popup-dark.webp');
    expect(img.alt).toContain('extension Candidash');
  });
});
