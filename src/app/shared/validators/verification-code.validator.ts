import { AbstractControl, ValidationErrors } from '@angular/forms';

export function verificationCodeValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return /^\d{6}$/.test(value) ? null : { invalidCode: true };
}
