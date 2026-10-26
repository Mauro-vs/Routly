import { AbstractControl, FormGroup } from '@angular/forms';

/** Clave con la que se guarda en un control el error que devuelve la API. */
const SERVER_ERROR = 'server';

export type ErrorMessage = (detail: Record<string, unknown>) => string;

/** Mensajes para los validadores de Angular. Se pueden ampliar por formulario. */
const DEFAULT_MESSAGES: Record<string, ErrorMessage> = {
  required: () => 'Este campo es obligatorio.',
  maxlength: (detail) => `Escribe como máximo ${String(detail['requiredLength'])} caracteres.`,
  minlength: (detail) => `Escribe al menos ${String(detail['requiredLength'])} caracteres.`,
  min: (detail) => `El valor mínimo es ${String(detail['min'])}.`,
  max: (detail) => `El valor máximo es ${String(detail['max'])}.`,
  pattern: () => 'El formato no es válido.',
  email: () => 'Escribe un correo electrónico válido.',
  integer: () => 'Escribe un número entero.',
  positive: () => 'Tiene que ser mayor que 0.',
  letterAndNumber: () => 'Usa al menos una letra y un número.',
  future: () => 'Elige una fecha futura.',
  url: () => 'Escribe una dirección completa, que empiece por https://.',
  decimals: (detail) => `Usa como mucho ${String(detail['places'])} decimales.`,
};

/**
 * Mensaje del primer error de un control, o null si es válido.
 * El error de la API tiene prioridad: es el que acaba de rechazar el envío.
 */
export function controlErrorMessage(
  control: AbstractControl,
  messages: Record<string, ErrorMessage> = {},
): string | null {
  const errors = control.errors;
  if (!errors) return null;

  const serverMessage: unknown = errors[SERVER_ERROR];
  if (typeof serverMessage === 'string') return serverMessage;

  for (const [key, detail] of Object.entries(errors)) {
    const message = messages[key] ?? DEFAULT_MESSAGES[key];
    if (message) return message(isRecord(detail) ? detail : {});
  }

  return 'El valor no es válido.';
}

/**
 * Reparte los errores de campo que devuelve la API entre los controles del
 * formulario. Devuelve los que no corresponden a ningún control, para mostrarlos
 * aparte. El error se borra solo en cuanto el usuario cambia el valor.
 */
export function applyServerErrors(
  form: FormGroup,
  fieldErrors: Record<string, string>,
): Record<string, string> {
  const unmatched: Record<string, string> = {};

  for (const [field, message] of Object.entries(fieldErrors)) {
    const control = form.get(field);
    if (!control) {
      unmatched[field] = message;
      continue;
    }
    control.setErrors({ ...control.errors, [SERVER_ERROR]: message });
    control.markAsTouched();
  }

  return unmatched;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
