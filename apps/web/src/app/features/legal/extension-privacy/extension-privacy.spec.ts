import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExtensionPrivacy } from './extension-privacy';

describe('ExtensionPrivacy', () => {
  it("annonce l'API sur le domaine du site, là où l'extension envoie les identifiants", () => {
    // Given
    TestBed.configureTestingModule({ providers: [provideRouter([])] });

    // When
    const fixture = TestBed.createComponent(ExtensionPrivacy);
    fixture.detectChanges();

    // Then
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('(candidash.nedellec-julien.fr/api)');
    expect(text).not.toContain('api-candidash');
  });
});
