import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { AppTitleStrategy, DEFAULT_TITLE } from './app-title-strategy';

@Component({ template: '' })
class Blank {}

describe('AppTitleStrategy', () => {
  function setup(): { router: Router; title: Title } {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Blank },
          { path: 'titled', title: 'Page titrée', component: Blank },
        ]),
        { provide: TitleStrategy, useClass: AppTitleStrategy },
      ],
    });
    return { router: TestBed.inject(Router), title: TestBed.inject(Title) };
  }

  it('uses the route title when the route defines one', async () => {
    // Given
    const { router, title } = setup();

    // When
    await router.navigateByUrl('/titled');

    // Then
    expect(title.getTitle()).toBe('Page titrée');
  });

  it('falls back to the default title after leaving a titled route', async () => {
    // Given
    const { router, title } = setup();
    await router.navigateByUrl('/titled');

    // When
    await router.navigateByUrl('/');

    // Then
    expect(title.getTitle()).toBe(DEFAULT_TITLE);
  });
});
