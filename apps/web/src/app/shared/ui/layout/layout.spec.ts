import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthState } from '@features/auth/application/auth-state';
import { Layout } from './layout';

describe('Layout', () => {
  function setup(): ComponentFixture<Layout> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthState, useValue: { isAuthenticated: signal(false) } },
      ],
    });
    const fixture = TestBed.createComponent(Layout);
    fixture.detectChanges();
    return fixture;
  }

  function main(fixture: ComponentFixture<Layout>): HTMLElement {
    return fixture.nativeElement.querySelector('[data-testid="layout-main"]');
  }

  it('keeps the content in a centred column by default', () => {
    // Given / When
    const fixture = setup();

    // Then
    expect(main(fixture).classList).toContain('max-w-6xl');
  });

  it('spans the whole screen width when asked (Kanban board)', () => {
    // Given
    const fixture = setup();

    // When
    fixture.componentRef.setInput('wide', true);
    fixture.detectChanges();

    // Then
    expect(main(fixture).classList).not.toContain('max-w-6xl');
  });
});
