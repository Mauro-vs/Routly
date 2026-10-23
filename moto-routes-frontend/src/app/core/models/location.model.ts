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

/** Coordenadas en grados decimales, "39.5696, 2.6502", o null si no tiene. */
export function locationCoordinates(location: Pick<Location, 'latitude' | 'longitude'>): string | null {
  const { latitude, longitude } = location;
  if (latitude === undefined || longitude === undefined) return null;
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/** Enlace a OpenStreetMap centrado en sus coordenadas, o null si no tiene. */
export function locationMapUrl(location: Pick<Location, 'latitude' | 'longitude'>): string | null {
  const { latitude, longitude } = location;
  if (latitude === undefined || longitude === undefined) return null;
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=13/${latitude}/${longitude}`;
}
