import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { ExtensionBanner } from './extension-banner';
import { ExtensionDetection } from './service/extension-detection';
import type { ExtensionStatus } from './service/extension-detection';
import { Config } from '@core/services/config';

describe('ExtensionBanner', () => {
  let statusSignal: WritableSignal<ExtensionStatus>;
  let checkSpy: ReturnType<typeof vi.fn>;

  function setup(extensionId: string | undefined): ComponentFixture<ExtensionBanner> {
    statusSignal = signal<ExtensionStatus>('unknown');
    checkSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: ExtensionDetection, useValue: { status: statusSignal.asReadonly(), check: checkSpy } },
        { provide: Config, useValue: { extensionId } },
      ],
    });

    return TestBed.createComponent(ExtensionBanner);
  }

  afterEach(() => localStorage.clear());

  it('calls check() once the component has rendered', async () => {
    // Given
    const fixture = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    fixture.detectChanges();
    await fixture.whenStable();

    // Then
    expect(checkSpy).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while the status is unknown or checking', () => {
    // Given
    const fixture = setup('abcdefghijklmnopabcdefghijklmnop');
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();

    // When
    statusSignal.set('checking');
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });

  it('shows the "coming soon" message and no link when unavailable', () => {
    // Given
    const fixture = setup(undefined);

    // When
    statusSignal.set('unavailable');
    fixture.detectChanges();

    // Then
    const el = fixture.nativeElement.querySelector('[role="status"]');
    expect(el).not.toBeNull();
    expect(el.textContent).toContain('bientôt');
    expect(el.querySelector('a')).toBeNull();
  });

  it('shows the install link with the Web Store URL when not installed', () => {
    // Given
    const fixture = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    statusSignal.set('not-installed');
    fixture.detectChanges();

    // Then
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.href).toBe('https://chromewebstore.google.com/detail/abcdefghijklmnopabcdefghijklmnop');
  });

  it('hides the banner when installed', () => {
    // Given
    const fixture = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    statusSignal.set('installed');
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });

  it('dismisses and persists the choice to localStorage', () => {
    // Given
    const fixture = setup('abcdefghijklmnopabcdefghijklmnop');
    statusSignal.set('not-installed');
    fixture.detectChanges();

    // When
    const closeButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-label="Fermer ce message"]',
    );
    closeButton.click();
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    expect(localStorage.getItem('extension-banner-dismissed')).toBe('true');
  });

  it('stays hidden on a fresh render when a previous dismissal was persisted', () => {
    // Given
    localStorage.setItem('extension-banner-dismissed', 'true');
    const fixture = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    statusSignal.set('not-installed');
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });
});
