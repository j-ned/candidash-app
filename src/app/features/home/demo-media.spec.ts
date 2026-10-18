import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ThemeManager, type Theme } from '@shared/ui/theme-toggle/service/theme';
import { DemoMedia } from './demo-media';

describe('DemoMedia', () => {
  let theme: WritableSignal<Theme>;
  let reveal: (visible: boolean) => void;
  let play: ReturnType<typeof vi.fn>;
  let pause: ReturnType<typeof vi.fn>;

  function stubBrowser(reducedMotion = false): void {
    window.matchMedia = vi.fn((query: string) => ({
      matches: reducedMotion && query.includes('reduce'),
    })) as unknown as typeof window.matchMedia;
    window.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) {
        reveal = (visible) =>
          callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as never);
      }
      observe(): void {}
      disconnect(): void {}
    } as unknown as typeof IntersectionObserver;
    play = vi.fn(() => Promise.resolve());
    pause = vi.fn();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause);
  }

  async function render(
    inputs: { video?: boolean; priority?: boolean; reducedMotion?: boolean } = {},
  ): Promise<ComponentFixture<DemoMedia>> {
    stubBrowser(inputs.reducedMotion);
    theme = signal<Theme>('light');
    TestBed.configureTestingModule({
      providers: [{ provide: ThemeManager, useValue: { theme } }],
    });
    const fixture = TestBed.createComponent(DemoMedia);
    fixture.componentRef.setInput('name', 'board');
    fixture.componentRef.setInput('alt', 'Le tableau Kanban des candidatures');
    fixture.componentRef.setInput('width', 1600);
    fixture.componentRef.setInput('height', 1000);
    fixture.componentRef.setInput('video', inputs.video ?? true);
    fixture.componentRef.setInput('priority', inputs.priority ?? false);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  const host = (fixture: ComponentFixture<DemoMedia>): HTMLElement => fixture.nativeElement;
  const clip = (fixture: ComponentFixture<DemoMedia>, variant: Theme): HTMLVideoElement =>
    host(fixture).querySelector(`video[data-variant="${variant}"]`) as HTMLVideoElement;

  async function settle(fixture: ComponentFixture<DemoMedia>): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  afterEach(() => vi.restoreAllMocks());

  it('shows the light and dark captures, only the light one loaded first when it is the LCP', async () => {
    // Given / When
    const fixture = await render({ priority: true });

    // Then
    const images = [...host(fixture).querySelectorAll('img')];
    expect(images.map((image) => image.getAttribute('src'))).toEqual([
      '/demo/board-light.webp',
      '/demo/board-dark.webp',
    ]);
    expect(images.map((image) => image.getAttribute('fetchpriority'))).toEqual(['high', 'auto']);
    expect(images[1].getAttribute('loading')).toBe('lazy');
    expect(images.every((image) => image.alt === 'Le tableau Kanban des candidatures')).toBe(true);
  });

  it('downloads no video before it is on screen', async () => {
    // Given / When
    const fixture = await render();

    // Then
    expect(clip(fixture, 'light').getAttribute('src')).toBeNull();
    expect(clip(fixture, 'dark').getAttribute('src')).toBeNull();
    expect(play).not.toHaveBeenCalled();
  });

  it('plays the clip of the current theme once on screen, and pauses it when it leaves', async () => {
    // Given
    const fixture = await render();

    // When
    reveal(true);
    await settle(fixture);

    // Then
    expect(clip(fixture, 'light').getAttribute('src')).toBe('/demo/board-light.webm');
    expect(clip(fixture, 'dark').getAttribute('src')).toBeNull();
    expect(play).toHaveBeenCalledTimes(1);

    // When
    reveal(false);
    await settle(fixture);

    // Then
    expect(pause).toHaveBeenCalled();
  });

  it('switches to the dark clip when the theme changes', async () => {
    // Given
    const fixture = await render();
    reveal(true);
    await settle(fixture);

    // When
    theme.set('dark');
    await settle(fixture);

    // Then
    expect(clip(fixture, 'dark').getAttribute('src')).toBe('/demo/board-dark.webm');
  });

  it('lets the visitor pause and resume the clip (WCAG 2.2.2)', async () => {
    // Given
    const fixture = await render();
    reveal(true);
    await settle(fixture);
    const toggle = host(fixture).querySelector('[data-testid="demo-toggle"]') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-label')).toBe('Mettre la démo en pause');

    // When
    toggle.click();
    await settle(fixture);

    // Then
    expect(pause).toHaveBeenCalled();
    expect(toggle.getAttribute('aria-label')).toBe('Lire la démo');
  });

  it('does not start on its own when the visitor prefers reduced motion', async () => {
    // Given
    const fixture = await render({ reducedMotion: true });

    // When
    reveal(true);
    await settle(fixture);

    // Then
    expect(play).not.toHaveBeenCalled();
    const toggle = host(fixture).querySelector('[data-testid="demo-toggle"]') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-label')).toBe('Lire la démo');

    // When
    toggle.click();
    await settle(fixture);

    // Then
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('is a plain capture without the video controls when there is no clip', async () => {
    // Given / When
    const fixture = await render({ video: false });

    // Then
    expect(host(fixture).querySelector('video')).toBeNull();
    expect(host(fixture).querySelector('[data-testid="demo-toggle"]')).toBeNull();
  });

  it('draws a window bar unless the scene already shows a browser', async () => {
    // Given
    const fixture = await render();
    expect(host(fixture).querySelector('[data-testid="demo-frame"]')).not.toBeNull();

    // When
    fixture.componentRef.setInput('frame', false);
    await settle(fixture);

    // Then
    expect(host(fixture).querySelector('[data-testid="demo-frame"]')).toBeNull();
  });
});
