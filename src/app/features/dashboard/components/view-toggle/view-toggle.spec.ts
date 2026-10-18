import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ViewToggle } from './view-toggle';

describe('ViewToggle', () => {
  function setup(view: 'list' | 'board'): ComponentFixture<ViewToggle> {
    const fixture = TestBed.createComponent(ViewToggle);
    fixture.componentRef.setInput('view', view);
    fixture.detectChanges();
    return fixture;
  }

  function button(fixture: ComponentFixture<ViewToggle>, testId: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
  }

  it('marks the current view as pressed', () => {
    // Given / When
    const fixture = setup('list');

    // Then
    expect(button(fixture, 'view-list').getAttribute('aria-pressed')).toBe('true');
    expect(button(fixture, 'view-board').getAttribute('aria-pressed')).toBe('false');
  });

  it('switches to the board and reports it to the parent', () => {
    // Given
    const fixture = setup('list');
    const emitted: string[] = [];
    fixture.componentInstance.view.subscribe((value) => emitted.push(value));

    // When
    button(fixture, 'view-board').click();
    fixture.detectChanges();

    // Then
    expect(emitted).toEqual(['board']);
    expect(button(fixture, 'view-board').getAttribute('aria-pressed')).toBe('true');
  });
});
