import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { JobtrackFormPage } from './jobtrack-form';
import { JobtrackGateway } from '@features/jobtrack/domain/gateways/jobtrack.gateway';
import { JobTrackBuilder } from '@features/jobtrack/test-utils/jobtrack.builder';
import type { JobTrack } from '@features/jobtrack/domain/models/jobtrack.model';
import { Toaster } from '@shared/ui/toast/service/toast';
import { PdfViewerModal } from '@shared/ui/pdf-viewer-modal/pdf-viewer-modal';
import { AuthState } from '@features/auth/application/auth-state';

type GatewayMock = {
  get: ReturnType<typeof vi.fn>;
  createWithReminder: ReturnType<typeof vi.fn>;
  updateWithReminder: ReturnType<typeof vi.fn>;
  uploadDocument: ReturnType<typeof vi.fn>;
};

type ToasterMock = {
  success: ReturnType<typeof vi.fn>;
  danger: ReturnType<typeof vi.fn>;
  warning: ReturnType<typeof vi.fn>;
};

const EXISTING_JOB: JobTrack = JobTrackBuilder.default()
  .with('id', 'jt-1')
  .with('title', 'Frontend Developer')
  .with('company', 'Acme Corp')
  .with('jobUrl', 'https://acme.com/jobs/1')
  .with('status', 'APPLIED')
  .with('appliedAt', '2026-10-10T00:00:00.000Z')
  .with('contractType', 'CDI')
  .with('notes', 'Contact RH sympathique')
  .with('reminder', {
    id: 'rem-1',
    jobTrackId: 'jt-1',
    frequency: 7,
    nextReminderAt: '2026-10-17T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-10-10T00:00:00.000Z',
    updatedAt: '2026-10-10T00:00:00.000Z',
  })
  .build();

describe('JobtrackFormPage', () => {
  let gateway: GatewayMock;
  let toast: ToasterMock;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Seule l'horloge est figée : le calcul du prochain rappel dépend de « aujourd'hui »
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 12, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function setup(id?: string): Promise<ComponentFixture<JobtrackFormPage>> {
    gateway = {
      get: vi.fn().mockReturnValue(of(EXISTING_JOB)),
      createWithReminder: vi.fn().mockReturnValue(of({ ...EXISTING_JOB, id: 'jt-new' })),
      updateWithReminder: vi.fn().mockReturnValue(of(EXISTING_JOB)),
      uploadDocument: vi.fn().mockReturnValue(of({ fileName: 'cv.pdf' })),
    };
    toast = { success: vi.fn(), danger: vi.fn(), warning: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: JobtrackGateway, useValue: gateway },
        { provide: Toaster, useValue: toast },
        { provide: PdfViewerModal, useValue: { open: vi.fn() } },
        { provide: AuthState, useValue: { isAuthenticated: () => false } },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(JobtrackFormPage);
    if (id) fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function byTestId<T extends HTMLElement>(
    fixture: ComponentFixture<JobtrackFormPage>,
    id: string,
  ): T {
    return fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
  }

  function type(fixture: ComponentFixture<JobtrackFormPage>, id: string, value: string): void {
    const field = byTestId<HTMLInputElement>(fixture, id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  function click(fixture: ComponentFixture<JobtrackFormPage>, id: string): void {
    byTestId(fixture, id).click();
    fixture.detectChanges();
  }

  function submitButton(fixture: ComponentFixture<JobtrackFormPage>): HTMLButtonElement {
    return byTestId(fixture, 'jobtrack-submit').querySelector('button') as HTMLButtonElement;
  }

  async function submit(fixture: ComponentFixture<JobtrackFormPage>): Promise<void> {
    byTestId<HTMLFormElement>(fixture, 'jobtrack-form').dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
    fixture.detectChanges();
  }

  describe('title validation', () => {
    it.each(['', 'a'])('shows the title error once the field holding %j is left', async (value) => {
      // Given
      const fixture = await setup();

      // When
      type(fixture, 'jobtrack-title', value);

      // Then
      expect(byTestId(fixture, 'jobtrack-title-error').textContent).toContain(
        'Le titre du poste est requis (minimum 2 caractères)',
      );
    });

    it('shows no error for a valid title', async () => {
      // Given
      const fixture = await setup();

      // When
      type(fixture, 'jobtrack-title', 'Dev');

      // Then
      expect(byTestId(fixture, 'jobtrack-title-error')).toBeNull();
    });
  });

  describe('invalid submit', () => {
    it('calls nothing and reveals the title error', async () => {
      // Given
      const fixture = await setup();

      // When
      await submit(fixture);

      // Then
      expect(gateway.createWithReminder).not.toHaveBeenCalled();
      expect(byTestId(fixture, 'jobtrack-title-error')).not.toBeNull();
      expect(byTestId(fixture, 'jobtrack-title').getAttribute('aria-invalid')).toBe('true');
    });

    it('keeps the submit button enabled while the form is invalid', async () => {
      // Given / When
      const fixture = await setup();

      // Then
      expect(submitButton(fixture).disabled).toBe(false);
    });
  });

  describe('create mode', () => {
    it('creates the job once with the expected payload, then navigates back', async () => {
      // Given
      const fixture = await setup();
      type(fixture, 'jobtrack-title', 'Développeur Angular');
      type(fixture, 'jobtrack-company', 'Acme');
      type(fixture, 'jobtrack-applied-at', '2026-10-10');
      click(fixture, 'jobtrack-contract-CDI');

      // When
      await submit(fixture);

      // Then
      expect(gateway.createWithReminder).toHaveBeenCalledTimes(1);
      expect(gateway.createWithReminder.mock.calls[0][0]).toStrictEqual({
        title: 'Développeur Angular',
        status: 'APPLIED',
        frequency: 7,
        nextReminderAt: '2026-10-17T00:00:00.000Z',
        isActive: true,
        company: 'Acme',
        contractType: 'CDI',
        appliedAt: '2026-10-10T00:00:00.000Z',
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Candidature créée',
        'La candidature a été ajoutée avec succès',
      );
      expect(navigate).toHaveBeenCalledWith(['/dashboard/jobtrack']);
    });

    it('sends the chosen frequency and deselects a contract type clicked twice', async () => {
      // Given
      const fixture = await setup();
      type(fixture, 'jobtrack-title', 'Développeur Angular');
      type(fixture, 'jobtrack-applied-at', '2026-10-10');
      click(fixture, 'jobtrack-contract-CDD');
      click(fixture, 'jobtrack-contract-CDD');
      click(fixture, 'jobtrack-frequency-14');

      // When
      await submit(fixture);

      // Then
      expect(gateway.createWithReminder.mock.calls[0][0]).toStrictEqual({
        title: 'Développeur Angular',
        status: 'APPLIED',
        frequency: 14,
        nextReminderAt: '2026-10-24T00:00:00.000Z',
        isActive: true,
        appliedAt: '2026-10-10T00:00:00.000Z',
      });
    });

    it('uploads the pending CV after creating the job', async () => {
      // Given
      const fixture = await setup();
      type(fixture, 'jobtrack-title', 'Développeur Angular');
      click(fixture, 'jobtrack-documents-toggle');
      const cv = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' });
      const input = byTestId<HTMLInputElement>(fixture, 'jobtrack-cv-input');
      Object.defineProperty(input, 'files', { value: [cv] });
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // When
      await submit(fixture);

      // Then
      expect(gateway.uploadDocument).toHaveBeenCalledWith('jt-new', 'cv', cv);
      expect(toast.success).toHaveBeenCalledWith(
        'Candidature créée',
        'La candidature et les documents ont été enregistrés',
      );
      expect(navigate).toHaveBeenCalledWith(['/dashboard/jobtrack']);
    });

    it('shows the server error, stays on the page and re-enables the button', async () => {
      // Given
      const fixture = await setup();
      gateway.createWithReminder.mockReturnValue(throwError(() => new Error('500')));
      type(fixture, 'jobtrack-title', 'Développeur Angular');

      // When
      await submit(fixture);

      // Then
      expect(toast.danger).toHaveBeenCalledWith('Erreur', 'Impossible de créer la candidature');
      expect(navigate).not.toHaveBeenCalled();
      expect(submitButton(fixture).disabled).toBe(false);
    });
  });

  describe('edit mode', () => {
    it('prefills the form from the loaded job', async () => {
      // Given / When
      const fixture = await setup('jt-1');

      // Then
      expect(gateway.get).toHaveBeenCalledWith('jt-1');
      expect(byTestId<HTMLInputElement>(fixture, 'jobtrack-title').value).toBe(
        'Frontend Developer',
      );
      expect(byTestId<HTMLInputElement>(fixture, 'jobtrack-company').value).toBe('Acme Corp');
      expect(byTestId<HTMLInputElement>(fixture, 'jobtrack-url').value).toBe(
        'https://acme.com/jobs/1',
      );
      expect(byTestId<HTMLInputElement>(fixture, 'jobtrack-applied-at').value).toBe('2026-10-10');
      expect(byTestId<HTMLTextAreaElement>(fixture, 'jobtrack-notes').value).toBe(
        'Contact RH sympathique',
      );
      expect(byTestId<HTMLInputElement>(fixture, 'jobtrack-frequency-7').checked).toBe(true);
      expect(byTestId<HTMLInputElement>(fixture, 'jobtrack-reminder-toggle').checked).toBe(true);
    });

    it('updates the job without touching an unchanged reminder', async () => {
      // Given
      const fixture = await setup('jt-1');
      type(fixture, 'jobtrack-title', 'Lead Frontend');

      // When
      await submit(fixture);

      // Then
      expect(gateway.updateWithReminder).toHaveBeenCalledTimes(1);
      const [id, payload, upsert] = gateway.updateWithReminder.mock.calls[0];
      expect(id).toBe('jt-1');
      expect(upsert).toBe(false);
      expect(payload).toStrictEqual({
        title: 'Lead Frontend',
        status: 'APPLIED',
        isActive: true,
        company: 'Acme Corp',
        jobUrl: 'https://acme.com/jobs/1',
        contractType: 'CDI',
        appliedAt: '2026-10-10T00:00:00.000Z',
        notes: 'Contact RH sympathique',
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Candidature modifiée',
        'La candidature a été mise à jour avec succès',
      );
      expect(navigate).toHaveBeenCalledWith(['/dashboard/jobtrack']);
    });

    it('recomputes the reminder when its frequency changes', async () => {
      // Given
      const fixture = await setup('jt-1');
      click(fixture, 'jobtrack-frequency-14');

      // When
      await submit(fixture);

      // Then
      const [, payload] = gateway.updateWithReminder.mock.calls[0];
      expect(payload).toMatchObject({ frequency: 14, nextReminderAt: '2026-10-24T00:00:00.000Z' });
    });
  });

  describe('reminder rules', () => {
    it('hides the reminder controls and disables reminders for a terminal status', async () => {
      // Given
      const fixture = await setup();
      type(fixture, 'jobtrack-title', 'Développeur Angular');

      // When
      click(fixture, 'jobtrack-status-ACCEPTED');
      await submit(fixture);

      // Then
      expect(byTestId(fixture, 'jobtrack-terminal-notice')).not.toBeNull();
      expect(byTestId(fixture, 'jobtrack-reminder-toggle')).toBeNull();
      expect(byTestId(fixture, 'jobtrack-frequency-7')).toBeNull();
      expect(gateway.createWithReminder.mock.calls[0][0]).toMatchObject({
        status: 'ACCEPTED',
        isActive: false,
      });
    });

    it('hides the frequency choices once reminders are switched off', async () => {
      // Given
      const fixture = await setup();
      type(fixture, 'jobtrack-title', 'Développeur Angular');

      // When
      click(fixture, 'jobtrack-reminder-toggle');
      await submit(fixture);

      // Then
      expect(byTestId(fixture, 'jobtrack-frequency-7')).toBeNull();
      expect(gateway.createWithReminder.mock.calls[0][0]).toMatchObject({ isActive: false });
    });
  });
});
