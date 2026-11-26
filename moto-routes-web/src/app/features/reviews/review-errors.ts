import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

import { ReviewTargetType } from '../../core/reviews/reviews.models';

/** El code que manda la API con el error (REVIEW_ALREADY_EXISTS, OWN_TARGET...), si lo hay. */
export function errorCode(error: unknown): string | undefined {
  if (!(error instanceof HttpErrorResponse)) return undefined;
  const body: unknown = error.error;
  if (typeof body !== 'object' || body === null) return undefined;
  const code = (body as Record<string, unknown>)['code'];
  return typeof code === 'string' ? code : undefined;
}

const OWN: Record<ReviewTargetType, string> = {
  experience: 'No puedes opinar sobre tus propias experiencias.',
  host: 'No puedes opinar sobre ti mismo como guía.',
};
const ALREADY: Record<ReviewTargetType, string> = {
  experience: 'Ya has opinado sobre esta experiencia. Puedes editar tu opinión.',
  host: 'Ya has opinado sobre este guía. Puedes editar tu opinión.',
};

/** Por qué no se ha podido guardar la opinión, en español y con sentido. */
export function reviewErrorMessage(error: unknown, type: ReviewTargetType): string {
  if (error instanceof TimeoutError) return 'Está tardando demasiado en responder. Vuelve a intentarlo.';
  if (!(error instanceof HttpErrorResponse)) return 'Algo ha fallado. Vuelve a intentarlo.';

  switch (errorCode(error)) {
    case 'REVIEW_ALREADY_EXISTS':
      return ALREADY[type];
    case 'OWN_TARGET':
      return OWN[type];
    case 'COMMENT_REQUIRED_FOR_LOW_RATING':
      return 'Con 1 o 2 estrellas, cuéntanos qué ha fallado (30 caracteres como mínimo).';
  }

  switch (error.status) {
    case 0:
      return 'No hemos podido conectar. Comprueba tu conexión y vuelve a intentarlo.';
    case 400:
      return 'Revisa la opinión: las estrellas, el título (hasta 100 caracteres) y el comentario (de 10 a 2000).';
    case 401:
      return 'Tu sesión ha terminado. Entra otra vez para guardar tu opinión.';
    case 403:
      return 'Esta opinión no es tuya.';
    case 404:
      return 'Ya no se puede opinar aquí: puede que ya no esté disponible.';
    case 409:
      return ALREADY[type];
    case 429:
      return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
    default:
      return 'Algo ha fallado de nuestro lado. Vuelve a intentarlo en unos minutos.';
  }
}

/** Por qué no se ha podido subir una foto. */
export function photoErrorMessage(error: unknown): string {
  if (error instanceof PhotoTooLargeError) return 'La foto pesa demasiado incluso reducida. Prueba con otra.';
  if (error instanceof UnreadablePhotoError) return 'No hemos podido leer la foto. Usa una JPEG, PNG o WebP.';
  if (error instanceof TimeoutError) return 'La subida está tardando demasiado.';
  if (!(error instanceof HttpErrorResponse)) return 'No se ha podido subir.';

  switch (errorCode(error)) {
    case 'INVALID_IMAGE':
      return 'No es una foto válida (JPEG, PNG o WebP).';
    case 'PHOTO_TOO_LARGE':
      return 'La foto pesa demasiado.';
    case 'TOO_MANY_PHOTOS':
      return 'Ya tiene las 4 fotos que caben.';
  }
  if (error.status === 413) return 'La foto pesa demasiado.';
  if (error.status === 0) return 'No hemos podido conectar.';
  return 'No se ha podido subir.';
}

/** La foto no baja de 1 MB ni con la calidad más baja. */
export class PhotoTooLargeError extends Error {}

/** El navegador no ha podido abrir el archivo como imagen. */
export class UnreadablePhotoError extends Error {}
