import { BaseEntity } from './entity.model';

/** Lugar que sirve de origen o destino de una ruta. */
export interface Location extends BaseEntity {
  city: string;
  region?: string;
  country: string;
  /** Las coordenadas van las dos o ninguna. */
  latitude?: number;
  longitude?: number;
}

/** Lo que trae una ruta de su origen y su destino (`populate`). */
export type LocationSummary = Pick<Location, '_id' | 'city' | 'region' | 'country' | 'slug'>;

/** Cuerpo de `POST /api/locations`. Sin `country`, la API pone "España". */
export interface LocationPayload {
  city: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export const LOCATION_LIMITS = {
  city: 80,
  region: 80,
  country: 80,
} as const;
