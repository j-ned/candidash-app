import { TestBed } from '@angular/core/testing';
import { Config } from '@core/services/config';
import { ExtensionShowcase } from './extension-showcase';

describe('ExtensionShowcase', () => {
  it('shows the recorded popup demo and the official store badges', async () => {
    // Given
    TestBed.configureTestingModule({
      providers: [
        { provide: Config, useValue: { extensionId: 'abcdefghijklmnopabcdefghijklmnop' } },
      ],
    });

    // When
    const fixture = TestBed.createComponent(ExtensionShowcase);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Then
    const host: HTMLElement = fixture.nativeElement;
    const demo = host.querySelector('app-demo-media img');
    expect(demo?.getAttribute('src')).toBe('/demo/extension-light.webp');
    expect(demo?.getAttribute('alt')).toContain('extension Candidash');
    expect(host.querySelector('[data-testid="store-link-chrome"]')).not.toBeNull();
    expect(host.querySelector('#extension-titre')?.textContent).toContain('en un clic');
  });
});
