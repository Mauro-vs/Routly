import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

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

/**
 * Mayor que 0, sin el 0 (distancias y duraciones). `Validators.min(0)` lo incluiría.
 * Vacío no es error: eso lo dice `required`.
 */
export function positive(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return typeof value !== 'number' || value > 0 ? null : { positive: true };
}

/**
 * Un correo con el mismo formato que exige la API (el de Zod): `Validators.email`
 * acepta "ana@localhost", y la API no.
 */
const EMAIL =
  /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

export function email(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  return EMAIL.test(value.trim()) ? null : { email: true };
}

/** Una contraseña con al menos una letra y un número, como pide la API. */
export function letterAndNumber(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'string' || value === '') return null;
  return /\p{L}/u.test(value) && /\d/.test(value) ? null : { letterAndNumber: true };
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

/** Una fecha (`datetime-local` o ISO) que todavía no ha pasado. */
export function futureDate(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'string' || value === '') return null;
  return new Date(value).getTime() > Date.now() ? null : { future: true };
}

/**
 * Validador de grupo: el campo `end` es posterior al campo `start` (dos fechas). El
 * error (`dateOrder`) queda en el grupo.
 */
export function endAfterStart(start: string, end: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const from: unknown = group.get(start)?.value;
    const to: unknown = group.get(end)?.value;
    if (typeof from !== 'string' || typeof to !== 'string' || !from || !to) return null;
    return new Date(to).getTime() > new Date(from).getTime() ? null : { dateOrder: true };
  };
}

/** Una dirección web completa con `https://`, como pide la API. */
export function httpsUrl(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const { protocol } = new URL(value.trim());
    return protocol === 'https:' ? null : { url: true };
  } catch {
    return { url: true };
  }
}

/**
 * Obligatorio de verdad: un texto solo con espacios no cuenta. La API recorta los
 * espacios antes de validar, así que "   " llegaría vacío y lo rechazaría.
 */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return typeof value === 'string' && value.trim() !== '' ? null : { required: true };
}
