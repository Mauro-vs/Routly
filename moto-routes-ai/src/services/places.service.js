import { createCache } from "./cache.js";

const MONTH = 30 * 24 * 60 * 60 * 1000;

/**
 * Dónde está una ubicación de la API. Con latitude y longitude, esas; sin ellas (son opcionales en
 * el panel), se busca la ciudad en el geocodificador de Open-Meteo, y se guarda un mes.
 *
 * Devuelve { city, region, country, slug, latitude, longitude }, o null si no se encuentra.
 */
export function createPlacesService({ weather }) {
  const cache = createCache({ ttlMs: MONTH, max: 1000 });

  return {
    async resolve(location) {
      if (!location) return null;
      const { city, region = null, country = null, slug = null } = location;
      const place = { city, region, country, slug };
      if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
        return { ...place, latitude: location.latitude, longitude: location.longitude };
      }
      const found = await cache.wrap(`geocode:${city}|${region}|${country}`, async () => (await weather.geocode(location)) ?? false);
      return found ? { ...place, ...found } : null;
    },
  };
}
