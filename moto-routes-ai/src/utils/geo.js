// Cálculos con coordenadas (grados decimales)

const EARTH_RADIUS_KM = 6371;
const radians = (degrees) => (degrees * Math.PI) / 180;

/** Distancia en km entre dos puntos, en línea recta sobre la Tierra (fórmula del haversine). */
export function distanceKm(a, b) {
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Clave de caché de un punto: redondeado a 2 decimales (~1 km), los puntos cercanos comparten. */
export const pointKey = ({ latitude, longitude }) => `${latitude.toFixed(2)},${longitude.toFixed(2)}`;

/** Si dos ubicaciones son la misma (ruta circular). */
export const samePoint = (a, b) => Boolean(a && b) && distanceKm(a, b) < 0.5;
