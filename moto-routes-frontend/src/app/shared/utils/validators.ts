import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Obligatorio de verdad: un texto solo con espacios no cuenta. La API recorta los
 * espacios antes de validar, así que "   " llegaría vacío y lo rechazaría.
 */
/**
 * Longitud mínima sin contar los espacios de los extremos, como la API (que recorta
 * antes de validar). Un campo vacío lo deja para `notBlank` o para el opcional.
 */
export function minTrimmed(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: unknown = control.value;
    if (typeof value !== 'string') return null;
    const length = value.trim().length;
    return length > 0 && length < min ? { minlength: { requiredLength: min, actualLength: length } } : null;
  };
}

/**
 * Validador de grupo: dos campos que van los dos o ninguno, como la latitud y la
 * longitud de una ubicación. El error (`pair`) queda en el grupo.
 */
export function bothOrNone(first: string, second: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const filled = (name: string): boolean => {
      const value: unknown = group.get(name)?.value;
      return value !== null && value !== undefined && value !== '';
    };
    return filled(first) === filled(second) ? null : { pair: true };
  };
}

/** Un número entero (las plazas). Vacío no es error: eso lo dice `required`. */
export function integer(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return typeof value !== 'number' || Number.isInteger(value) ? null : { integer: true };
}

/** Como mucho `places` decimales (un precio, con céntimos). */
export function maxDecimals(places: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: unknown = control.value;
    if (typeof value !== 'number') return null;
    const scaled = value * 10 ** places;
    return Math.abs(scaled - Math.round(scaled)) < 1e-9 ? null : { decimals: { places } };
  };
}

export function notBlank(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return typeof value === 'string' && value.trim() !== '' ? null : { required: true };
}
