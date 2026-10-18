import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';
import { SPRITE_VERSION } from './sprite-version';

describe('Icon', () => {
  it('points to the sprite with its content fingerprint, so a new icon bypasses the immutable cache', () => {
    // Given
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', 'lucide-check');

    // When
    fixture.detectChanges();

    // Then
    const use: SVGUseElement = fixture.nativeElement.querySelector('use');
    expect(SPRITE_VERSION).toMatch(/^[0-9a-f]{8}$/);
    expect(use.getAttribute('href')).toBe(`/icons/sprite.svg?v=${SPRITE_VERSION}#lucide-check`);
  });
});
