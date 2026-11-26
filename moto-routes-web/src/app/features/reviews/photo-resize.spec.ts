import { PhotoTooLargeError, UnreadablePhotoError } from './review-errors';
import { fitInside, resizePhoto } from './photo-resize';

// Una foto de verdad, pintada en un canvas: con ruido para que no se comprima a casi nada
async function photo(width: number, height: number, type = 'image/png'): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(width, height);
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = (i * 7) % 255;
    image.data[i + 1] = (i * 13) % 255;
    image.data[i + 2] = (i * 3) % 255;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), type));
}

const sizeOf = async (blob: Blob): Promise<{ width: number; height: number }> => {
  const bitmap = await createImageBitmap(blob);
  return { width: bitmap.width, height: bitmap.height };
};

describe('resizePhoto', () => {
  it('fitInside deja el lado mayor en 1600 sin deformar, y no agranda las pequeñas', () => {
    expect(fitInside(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitInside(1200, 2400)).toEqual({ width: 800, height: 1600 });
    expect(fitInside(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('una foto grande sale en WebP, con el lado mayor de 1600 px y de menos de 1 MB', async () => {
    const result = await resizePhoto(await photo(2400, 1600));
    expect(result.type).toBe('image/webp');
    expect(result.size).toBeLessThanOrEqual(1_048_576);
    expect(await sizeOf(result)).toEqual({ width: 1600, height: 1067 });
  });

  it('si ni con la calidad más baja cabe, PhotoTooLargeError', async () => {
    await expectAsync(resizePhoto(await photo(400, 300), 200)).toBeRejectedWithError(PhotoTooLargeError);
  });

  it('lo que no es una imagen, UnreadablePhotoError', async () => {
    await expectAsync(resizePhoto(new Blob(['no soy una foto'], { type: 'image/jpeg' }))).toBeRejectedWithError(UnreadablePhotoError);
  });
});
