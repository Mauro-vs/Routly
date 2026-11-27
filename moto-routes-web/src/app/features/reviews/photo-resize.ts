import { REVIEW_LIMITS } from './reviews.models';

/** El lado mayor de una foto subida, en píxeles */
export const PHOTO_MAX_SIDE = 1600;

/** Las calidades que se prueban, de mejor a peor, hasta que la foto quepa en 1 MB */
const QUALITIES = [0.8, 0.65, 0.5];

/** El tamaño que cabe en un cuadrado de `max` píxeles sin deformar ni agrandar la foto. */
export function fitInside(width: number, height: number, max = PHOTO_MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Reduce una foto en el navegador antes de subirla: lado mayor de 1600 px y WebP con calidad 0,8.
 * Si aún pasa de 1 MB, baja la calidad; si no hay manera, PhotoTooLargeError. Si el navegador no
 * sabe escribir WebP (devuelve otra cosa), JPEG. Así sube poco y la API no tiene que reducir nada.
 */
export async function resizePhoto(file: Blob, maxBytes: number = REVIEW_LIMITS.photoMaxBytes): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new UnreadablePhotoError();
  }

  const size = fitInside(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new UnreadablePhotoError();
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  for (const quality of QUALITIES) {
    let blob = await toBlob(canvas, 'image/webp', quality);
    if (blob && blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality);
    if (!blob) throw new UnreadablePhotoError();
    if (blob.size <= maxBytes) return blob;
  }
  throw new PhotoTooLargeError();
}

/** La foto no baja de 1 MB ni con la calidad más baja. */
export class PhotoTooLargeError extends Error {}

/** El navegador no ha podido abrir el archivo como imagen. */
export class UnreadablePhotoError extends Error {}
