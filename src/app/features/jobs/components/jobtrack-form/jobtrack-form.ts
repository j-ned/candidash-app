import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LayoutComponent } from '@shared/ui/layout/layout';
import { ButtonComponent } from '@shared/ui/button/button';
import { Jobtrack } from '../../services/jobtrack';
import type {
  CreateJobTrackWithReminderDto,
  JobTrack,
  JobStatus,
  ContractType,
  UpdateJobTrackWithReminderDto,
} from '../../models/jobtrack';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@core/services/auth';
import { ToastService } from '@shared/ui/toast/service/toast';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-jobtrack-form-page',
  imports: [LayoutComponent, ReactiveFormsModule, ButtonComponent, NgOptimizedImage],
  templateUrl: './jobtrack-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobTrackFormPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(Jobtrack);
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
    const baseDate = value.appliedAt ? new Date(value.appliedAt) : new Date();
    const nextReminderAt = new Date(baseDate.getTime() + value.frequency * 24 * 60 * 60 * 1000);

    this.submitting.set(true);

    const isEdit = this.isEdit() && this.jobId;

    if (isEdit) {
      const updatePayload: UpdateJobTrackWithReminderDto = {
        title: value.title,
        status: value.status,
        frequency: value.frequency,
        nextReminderAt: nextReminderAt.toISOString(),
        isActive: true,
      };

      if (value.company) updatePayload.company = value.company;
      if (value.jobUrl) updatePayload.jobUrl = value.jobUrl;
      if (value.contractType) updatePayload.contractType = value.contractType;
      if (value.appliedAt) updatePayload.appliedAt = value.appliedAt;
      if (value.notes) updatePayload.notes = value.notes;

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
        status: value.status,
        frequency: value.frequency,
        nextReminderAt: nextReminderAt.toISOString(),
        isActive: true,
      };

      if (value.company) createPayload.company = value.company;
      if (value.jobUrl) createPayload.jobUrl = value.jobUrl;
      if (value.contractType) createPayload.contractType = value.contractType;
      if (value.appliedAt) createPayload.appliedAt = value.appliedAt;
      if (value.notes) createPayload.notes = value.notes;

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
