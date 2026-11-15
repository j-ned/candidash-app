import { Component, DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SITE_ORIGIN, canonicalUrl, startCanonicalLink } from './canonical-link';

@Component({ template: '' })
class Blank {}

describe('canonicalUrl', () => {
  it.each([
    ['/', 'https://site.test/'],
    ['/features', 'https://site.test/features'],
    ['/features/', 'https://site.test/features'],
    ['/features?utm_source=x', 'https://site.test/features'],
    ['/features#demo', 'https://site.test/features'],
    ['/features/?utm_source=x#demo', 'https://site.test/features'],
    ['/?utm_source=x', 'https://site.test/'],
    ['/auth/signup', 'https://site.test/auth/signup'],
  ])('maps %s to %s', (routerUrl, expected) => {
    expect(canonicalUrl('https://site.test', routerUrl)).toBe(expected);
  });
});

describe('startCanonicalLink', () => {
  function setup(): { router: Router; canonicals: () => string[] } {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Blank },
          { path: 'features', component: Blank },
          { path: '**', redirectTo: '' },
        ]),
        { provide: SITE_ORIGIN, useValue: 'https://site.test' },
      ],
    });
    TestBed.runInInjectionContext(() => startCanonicalLink());
    const head = TestBed.inject(DOCUMENT).head;
    return {
      router: TestBed.inject(Router),
      canonicals: () =>
        Array.from(head.querySelectorAll('link[rel="canonical"]'), (link) =>
          link.getAttribute('href'),
        ).filter((href) => href !== null),
    };
  }

  afterEach(() => {
    for (const link of Array.from(document.head.querySelectorAll('link[rel="canonical"]'))) {
      link.remove();
    }
  });

  it('declares the page reached, without its query string', async () => {
    // Given
    const { router, canonicals } = setup();

    // When
    await router.navigateByUrl('/features?utm_source=x');

    // Then
    expect(canonicals()).toEqual(['https://site.test/features']);
  });

  it('keeps a single canonical link across navigations', async () => {
    // Given
    const { router, canonicals } = setup();
    await router.navigateByUrl('/features');

    // When
    await router.navigateByUrl('/');

    // Then
    expect(canonicals()).toEqual(['https://site.test/']);
  });

  it('reuses the canonical link already present in the prerendered page', async () => {
    // Given
    const prerendered = document.createElement('link');
    prerendered.setAttribute('rel', 'canonical');
    prerendered.setAttribute('href', 'https://site.test/');
    document.head.appendChild(prerendered);
    const { router, canonicals } = setup();

    // When
    await router.navigateByUrl('/features');

    // Then
    expect(canonicals()).toEqual(['https://site.test/features']);
  });

  it('points an unknown address to the page it is redirected to', async () => {
    // Given
    const { router, canonicals } = setup();

    // When
    await router.navigateByUrl('/nimporte-quoi');

    // Then
    expect(canonicals()).toEqual(['https://site.test/']);
  });
});
