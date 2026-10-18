import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DocumentAnalysis } from './document-analysis';
import { byTestId, testIdText } from '../../test-utils/by-test-id';

const CV = `# Camille Martin
camille.martin@exemple.fr

## Expérience
- Angular 22 et TypeScript

## Formation
- Master (2019)

## Compétences
Angular, TypeScript`;

const OFFER = 'Développeur Angular : Angular, TypeScript, NestJS et Docker. Angular au quotidien.';

describe('DocumentAnalysis', () => {
  function render(inputs: {
    markdown?: string;
    offerText?: string | null;
    jobLabel?: string | null;
  }): ComponentFixture<DocumentAnalysis> {
    const fixture = TestBed.createComponent(DocumentAnalysis);
    fixture.componentRef.setInput('kind', 'CV');
    fixture.componentRef.setInput('markdown', inputs.markdown ?? CV);
    fixture.componentRef.setInput('offerText', inputs.offerText ?? null);
    fixture.componentRef.setInput('jobLabel', inputs.jobLabel ?? null);
    fixture.detectChanges();
    return fixture;
  }

  const host = (fixture: ComponentFixture<DocumentAnalysis>): HTMLElement =>
    fixture.nativeElement as HTMLElement;

  it('Given an offer When analysed Then the keywords found and missing are listed with the coverage', () => {
    // Given / When
    const fixture = render({ offerText: OFFER, jobLabel: 'Développeur Angular — Acme' });

    // Then
    expect(testIdText(host(fixture), 'analysis-score')).toBe('2 mots-clés sur 4 (50 %)');
    const chips = (id: string) =>
      [...host(fixture).querySelectorAll(`[data-testid="${id}"] li`)].map((li) =>
        li.textContent?.trim(),
      );
    expect(chips('analysis-present')).toEqual(['Angular', 'TypeScript']);
    expect(chips('analysis-missing')).toEqual(['NestJS', 'Docker']);
  });

  it('Given no offer text When analysed Then it explains how to compare with an offer', () => {
    // Given / When
    const fixture = render({ jobLabel: 'Lead front — Studio' });

    // Then
    expect(testIdText(host(fixture), 'analysis-no-offer')).toContain('« Lead front — Studio »');
    expect(byTestId(host(fixture), 'analysis-score')).toBeNull();
  });

  it('Given a document When analysed Then each failed check shows its tip, passed checks do not', () => {
    // Given / When
    const fixture = render({ markdown: CV.replace('## Formation', '## Divers') });

    // Then
    const failed = [
      ...host(fixture).querySelectorAll('[data-testid="analysis-check"][data-ok="false"]'),
    ];
    expect(failed.map((li) => li.querySelector('p')?.textContent?.trim())).toEqual(
      expect.arrayContaining([
        'Ajoutez une section « Formation » avec vos diplômes et leur année.',
      ]),
    );
    const passed = host(fixture).querySelector('[data-testid="analysis-check"][data-ok="true"]');
    expect(passed?.querySelector('p')).toBeNull();
  });
});
