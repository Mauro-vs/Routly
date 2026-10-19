import { BaseRecord } from './entity.model';

/** Colecciones que pueden tener imágenes (IMAGE_OWNERS en la API). */
export type ImageOwnerType = 'route' | 'user' | 'host' | 'experience' | 'category' | 'location';

/** Imagen de cualquier colección. No tiene slug: se identifica por su `_id`. */
export interface Image extends BaseRecord {
  ownerType: ImageOwnerType;
  ownerId: string;
  url: string;
  alt?: string;
  /** Orden dentro de la galería de su dueño. */
  position: number;
  /** Imagen principal: portada de una ruta, foto de perfil de un usuario... */
  isCover: boolean;
}

/** Imagen principal que la API añade a rutas, usuarios y anfitriones (`coverImage`). */
export type ImageSummary = Pick<Image, '_id' | 'url' | 'alt'>;

/** Cuerpo de `POST /api/images`. En el PATCH no se pueden cambiar `ownerType` ni `ownerId`. */
export interface ImagePayload {
  ownerType: ImageOwnerType;
  ownerId: string;
  url: string;
  alt?: string;
  position?: number;
  isCover?: boolean;
}
