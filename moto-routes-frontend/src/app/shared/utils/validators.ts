import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Obligatorio de verdad: un texto solo con espacios no cuenta. La API recorta los
 * espacios antes de validar, así que "   " llegaría vacío y lo rechazaría.
 */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return typeof value === 'string' && value.trim() !== '' ? null : { required: true };
}
