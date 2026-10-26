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
  alt?: string | null;
  position?: number;
  isCover?: boolean;
}

/** Cómo se nombra cada tipo de dueño y en qué página del panel está su listado. */
export const IMAGE_OWNERS: Readonly<
  Record<ImageOwnerType, { label: string; path: string; gender: 'f' | 'm' }>
> = {
  route: { label: 'Ruta', path: '/routes', gender: 'f' },
  user: { label: 'Usuario', path: '/users', gender: 'm' },
  host: { label: 'Anfitrión', path: '/hosts', gender: 'm' },
  experience: { label: 'Experiencia', path: '/experiences', gender: 'f' },
  category: { label: 'Categoría', path: '/categories', gender: 'f' },
  location: { label: 'Ubicación', path: '/locations', gender: 'f' },
};

/** El detalle del dueño de una imagen. Solo se sabe su `_id`: lo resuelve `/<colección>/id/:id`. */
export function imageOwnerPath(image: Pick<Image, 'ownerType' | 'ownerId'>): string[] {
  return [IMAGE_OWNERS[image.ownerType].path, 'id', image.ownerId];
}

export const IMAGE_LIMITS = {
  url: 2048,
  alt: 200,
} as const;
