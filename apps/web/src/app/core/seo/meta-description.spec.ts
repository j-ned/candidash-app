import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { DEFAULT_DESCRIPTION, startMetaDescription } from './meta-description';

@Component({ template: '' })
class Blank {}

describe('startMetaDescription', () => {
  function setup(): { router: Router; descriptions: () => (string | null)[] } {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Blank },
          { path: 'features', component: Blank, data: { description: 'La visite guidée.' } },
          {
            path: 'legal',
            children: [{ path: 'terms', component: Blank, data: { description: 'Les CGU.' } }],
          },
          { path: 'malformed', component: Blank, data: { description: 42 } },
        ]),
      ],
    });
    TestBed.runInInjectionContext(() => startMetaDescription());
    const meta = TestBed.inject(Meta);
    return {
      router: TestBed.inject(Router),
      descriptions: () => meta.getTags('name="description"').map((tag) => tag.content),
    };
  }

  afterEach(() => {
    for (const tag of Array.from(document.head.querySelectorAll('meta[name="description"]'))) {
      tag.remove();
    }
  });

  it('describes the page with the text its route declares', async () => {
    // Given
    const { router, descriptions } = setup();

    // When
    await router.navigateByUrl('/features');

    // Then
    expect(descriptions()).toEqual(['La visite guidée.']);
  });

  it('reads the description of a nested route', async () => {
    // Given
    const { router, descriptions } = setup();

    // When
    await router.navigateByUrl('/legal/terms');

    // Then
    expect(descriptions()).toEqual(['Les CGU.']);
  });

  it('falls back to the default description after leaving a described route', async () => {
    // Given
    const { router, descriptions } = setup();
    await router.navigateByUrl('/features');

    // When
    await router.navigateByUrl('/');

    // Then
    expect(descriptions()).toEqual([DEFAULT_DESCRIPTION]);
  });

  it('replaces the description already present in the served page', async () => {
    // Given
    const served = document.createElement('meta');
    served.setAttribute('name', 'description');
    served.setAttribute('content', 'Description de index.html.');
    document.head.appendChild(served);
    const { router, descriptions } = setup();

    // When
    await router.navigateByUrl('/features');

    // Then
    expect(descriptions()).toEqual(['La visite guidée.']);
  });

  it('ignores a description that is not text', async () => {
    // Given
    const { router, descriptions } = setup();

    // When
    await router.navigateByUrl('/malformed');

    // Then
    expect(descriptions()).toEqual([DEFAULT_DESCRIPTION]);
  });
});
