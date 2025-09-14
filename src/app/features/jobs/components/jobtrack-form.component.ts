import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LayoutComponent } from '@shared/ui/layout/layout';
import { ButtonComponent } from '@shared/ui/button/button';
import { JobTrackService } from '../services/jobtrack.service';
import type {
  CreateJobTrackWithReminderDto,
  JobTrack,
  JobStatus,
  ContractType,
  UpdateJobTrackWithReminderDto,
} from '../models/jobtrack.types';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@core/services/auth';
import { ToastService } from '@shared/ui/toast/service/toast';

@Component({
  selector: 'app-jobtrack-form-page',
  imports: [LayoutComponent, ReactiveFormsModule, ButtonComponent],
  template: `
    <app-layout>
      <div class="max-w-3xl mx-auto p-4 sm:p-6">
        <div
          class="bg-card border border-border rounded-lg p-4 shadow-md space-y-4 sm:rounded-xl sm:p-6 sm:shadow-lg sm:space-y-6"
        >
          <div class="flex items-center justify-between">
            <h1 class="text-xl font-bold text-text sm:text-2xl lg:text-3xl">
              {{ isEdit() ? 'Modifier la candidature' : 'Nouvelle candidature' }}
            </h1>
          </div>

          <form class="space-y-6 sm:space-y-8" [formGroup]="form" (ngSubmit)="submit()">
            <!-- Section 1: Informations générales -->
            <div class="space-y-4 sm:space-y-5">
              <div class="border-l-4 border-primary pl-4">
                <h2 class="text-base font-semibold text-text sm:text-lg">
                  📋 Informations générales
                </h2>
                <p class="text-xs text-muted mt-1 sm:text-sm">
                  Détails de l'offre d'emploi et de l'entreprise
                </p>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
                <div class="space-y-1 sm:space-y-2">
                  <label class="block text-xs font-medium text-text sm:text-sm"
                    >Titre du poste recherché *</label
                  >
                  <input
                    class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary focus:border-primary transition-all border-border bg-background text-text text-sm sm:px-4 sm:py-3 sm:rounded-md sm:text-base"
                    formControlName="title"
                    placeholder="Ex: Développeur Full-Stack React/Node.js"
                  />
                  @if (form.get('title')?.errors && form.get('title')?.touched) {
                    <p class="text-xs text-error mt-1">
                      Le titre du poste est requis (minimum 2 caractères)
                    </p>
                  }
                </div>

                <div class="space-y-1 sm:space-y-2">
                  <label class="block text-xs font-medium text-text sm:text-sm"
                    >Nom de l'entreprise</label
                  >
                  <input
                    class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary focus:border-primary transition-all border-border bg-background text-text text-sm sm:px-4 sm:py-3 sm:rounded-md sm:text-base"
                    formControlName="company"
                    placeholder="Ex: Google, Airbnb, startup locale... (optionnel)"
                  />
                  <p class="text-xs text-muted">
                    💡 Aide à organiser vos candidatures par entreprise
                  </p>
                </div>

                <div class="space-y-1 sm:space-y-2">
                  <label class="block text-xs font-medium text-text sm:text-sm"
                    >Lien vers l'offre d'emploi</label
                  >
                  <input
                    class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary focus:border-primary transition-all border-border bg-background text-text text-sm sm:px-4 sm:py-3 sm:rounded-md sm:text-base"
                    formControlName="jobUrl"
                    placeholder="https://linkedin.com/jobs/... (optionnel)"
                  />
                  <p class="text-xs text-muted">🔗 Pour retrouver facilement l'offre originale</p>
                </div>

                <div class="space-y-1 sm:space-y-2">
                  <label class="block text-xs font-medium text-text sm:text-sm"
                    >Type de contrat</label
                  >
                  <select
                    class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary focus:border-primary transition-all border-border bg-background text-text text-sm sm:px-4 sm:py-3 sm:rounded-md sm:text-base"
                    formControlName="contractType"
                  >
                    <option value="">Non précisé</option>
                    <option value="CDI">CDI - Contrat à Durée Indéterminée</option>
                    <option value="CDD">CDD - Contrat à Durée Déterminée</option>
                    <option value="INTERIM">Intérim - Mission temporaire</option>
                    <option value="STAGE">Stage - Formation professionnelle</option>
                    <option value="ALTERNANCE">Alternance - Formation en alternance</option>
                    <option value="FREELANCE">Freelance - Mission indépendante</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Section 2: Suivi de candidature -->
            <div class="space-y-4 sm:space-y-5">
              <div class="border-l-4 border-accent pl-4">
                <h2 class="text-base font-semibold text-text sm:text-lg">
                  📊 Suivi de ma candidature
                </h2>
                <p class="text-xs text-muted mt-1 sm:text-sm">
                  Statut actuel et planification des relances
                </p>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
                <div class="space-y-1 sm:space-y-2">
                  <label class="block text-xs font-medium text-text sm:text-sm"
                    >Où en est ma candidature ?</label
                  >
                  <select
                    class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary focus:border-primary transition-all border-border bg-background text-text text-sm sm:px-4 sm:py-3 sm:rounded-md sm:text-base"
                    formControlName="status"
                  >
                    <option value="APPLIED">📤 Candidature envoyée - J'ai postulé</option>
                    <option value="PENDING">⏳ En cours d'examen - Mon profil est étudié</option>
                    <option value="INTERVIEW">🤝 Entretien - Échange prévu ou passé</option>
                    <option value="ACCEPTED">🎉 Acceptée - Offre reçue ou poste obtenu</option>
                    <option value="REJECTED">❌ Refusée - Candidature non retenue</option>
                  </select>
                </div>

                <div class="space-y-1 sm:space-y-2">
                  <label class="block text-xs font-medium text-text sm:text-sm"
                    >Date de ma candidature</label
                  >
                  <input
                    type="date"
                    class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary focus:border-primary transition-all border-border bg-background text-text text-sm sm:px-4 sm:py-3 sm:rounded-md sm:text-base"
                    formControlName="appliedAt"
                  />
                  <p class="text-xs text-muted">📅 Pour calculer les rappels automatiques</p>
                </div>
              </div>

              <div class="bg-muted-50 border border-border rounded-lg p-4 space-y-3">
                <h3 class="text-sm font-medium text-text flex items-center gap-2">
                  🔔 Rappels automatiques
                </h3>
                <p class="text-xs text-muted">Choisissez la fréquence de vos rappels de suivi :</p>

                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
                  @for (option of reminderOptions; track option.value) {
                    <label
                      class="flex items-start space-x-2 p-2 border rounded cursor-pointer hover:bg-background transition-colors"
                      [class.border-primary]="form.get('frequency')?.value === option.value"
                      [class.bg-primary-50]="form.get('frequency')?.value === option.value"
                    >
                      <input
                        type="radio"
                        [value]="option.value"
                        formControlName="frequency"
                        class="mt-0.5"
                      />
                      <div>
                        <div class="text-xs font-medium text-text">{{ option.label }}</div>
                        <div class="text-xs text-muted">{{ option.description }}</div>
                      </div>
                    </label>
                  }
                </div>

                <div class="text-xs text-muted bg-background border border-border rounded p-2">
                  💡 <strong>Conseil :</strong> Un suivi régulier augmente vos chances de réponse.
                  Nous vous enverrons un rappel par email.
                </div>
              </div>
            </div>

            <!-- Section 3: Notes personnelles -->
            <div class="space-y-4 sm:space-y-5">
              <div class="border-l-4 border-secondary pl-4">
                <h2 class="text-base font-semibold text-text sm:text-lg">
                  📝 Mes notes personnelles
                </h2>
                <p class="text-xs text-muted mt-1 sm:text-sm">Informations importantes à retenir</p>
              </div>

              <div class="space-y-1 sm:space-y-2">
                <label class="block text-xs font-medium text-text sm:text-sm"
                  >Notes et remarques</label
                >
                <textarea
                  rows="4"
                  class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary focus:border-primary transition-all border-border bg-background text-text text-sm sm:rows-5 sm:px-4 sm:py-3 sm:rounded-md sm:text-base"
                  formControlName="notes"
                  placeholder="Ex: Salaire discuté 45-50k, contact RH sympathique, télétravail possible 2j/semaine, équipe de 8 développeurs..."
                ></textarea>
                <p class="text-xs text-muted">
                  💭 Notez tout ce qui vous semble important : impressions, détails du poste,
                  échanges avec le recruteur...
                </p>
              </div>
            </div>

            <div class="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:gap-3 sm:pt-0">
              <app-button
                [customClass]="'w-full sm:w-auto px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base'"
                type="submit"
                color="primary"
                [isLoading]="submitting()"
                [disabled]="form.invalid || submitting()"
              >
                Enregistrer
              </app-button>
              <app-button
                [customClass]="'w-full sm:w-auto px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base'"
                type="button"
                color="secondary"
                (buttonClick)="cancel()"
              >
                Annuler
              </app-button>
            </div>
          </form>
        </div>
      </div>
    </app-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobTrackFormPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(JobTrackService);
  readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly submitting = signal(false);
  readonly isEdit = signal(false);
  private readonly jobId: string | null = null;

  readonly reminderOptions = [
    { value: 3, label: 'Suivi rapide (3 jours)', description: 'Pour les opportunités urgentes' },
    {
      value: 7,
      label: 'Suivi standard (1 semaine)',
      description: 'Recommandé pour la plupart des candidatures',
    },
    { value: 14, label: 'Suivi patient (2 semaines)', description: 'Pour les grandes entreprises' },
    {
      value: 30,
      label: 'Suivi long terme (1 mois)',
      description: 'Pour les postes très spécifiques',
    },
  ];

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    company: [''],
    jobUrl: [''],
    status: ['APPLIED' as JobStatus, [Validators.required]],
    contractType: [null as ContractType | null],
    appliedAt: [''],
    notes: [''],
    frequency: [7, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.jobId = id;
      this.service.get(id).subscribe((job) => this.patchForm(job));
    }
  }

  private patchForm(job: JobTrack): void {
    this.form.patchValue({
      title: job.title ?? '',
      company: job.company ?? '',
      jobUrl: job.jobUrl ?? '',
      status: job.status ?? 'APPLIED',
      contractType: job.contractType ?? null,
      appliedAt: job.appliedAt ? job.appliedAt.substring(0, 10) : '',
      notes: job.notes ?? '',
      frequency: job.reminder?.frequency ?? 7,
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const userId = this.authService.user()?.id;

    const baseDate = value.appliedAt ? new Date(value.appliedAt) : new Date();
    const nextReminderAt = new Date(baseDate.getTime() + value.frequency * 24 * 60 * 60 * 1000);

    this.submitting.set(true);

    const isEdit = this.isEdit() && this.jobId;

    if (isEdit) {
      const updatePayload: UpdateJobTrackWithReminderDto = {
        title: value.title,
        company: value.company || undefined,
        jobUrl: value.jobUrl || undefined,
        status: value.status,
        contractType: value.contractType ?? undefined,
        appliedAt: value.appliedAt || undefined,
        notes: value.notes || undefined,
        attachments: userId ? { cvUserPath: `/users/cv/${userId}` } : undefined,
        frequency: value.frequency,
        nextReminderAt: nextReminderAt.toISOString(),
        isActive: true,
      };

      this.service.updateWithReminder(this.jobId!, updatePayload, false).subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success(
            'Candidature modifiée',
            'La candidature a été mise à jour avec succès',
          );
          this.router.navigate(['/dashboard/jobtrack']);
        },
        error: () => {
          this.submitting.set(false);
          this.toast.danger('Erreur', 'Impossible de modifier la candidature');
        },
      });
    } else {
      const createPayload: CreateJobTrackWithReminderDto = {
        title: value.title,
        company: value.company || undefined,
        jobUrl: value.jobUrl || undefined,
        status: value.status,
        contractType: value.contractType ?? undefined,
        appliedAt: value.appliedAt || undefined,
        notes: value.notes || undefined,
        attachments: userId ? { cvUserPath: `/users/cv/${userId}` } : undefined,
        frequency: value.frequency,
        nextReminderAt: nextReminderAt.toISOString(),
        isActive: true,
      };

      this.service.createWithReminder(createPayload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success('Candidature créée', 'La candidature a été ajoutée avec succès');
          this.router.navigate(['/dashboard/jobtrack']);
        },
        error: () => {
          this.submitting.set(false);
          this.toast.danger('Erreur', 'Impossible de créer la candidature');
        },
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/dashboard/jobtrack']);
  }
}
