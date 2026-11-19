import { upstreamError } from "../utils/errors.js";
import { requestJson } from "../utils/http.js";

/*
 * OSRM (https://project-osrm.org): el recorrido por carretera entre varios puntos. El servidor de
 * demostración es gratis y sin clave, para un uso moderado; por eso el recorrido se guarda un mes
 * (services/routeMap.service.js).
 */
const SERVICE = "OSRM";
export const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const USER_AGENT = "Routly/1.0 (proyecto educativo de 2º DAW; moto-routes-ai)";

export function createOsrmClient({ fetch: fetchImpl, timeoutMs, url = OSRM_URL }) {
  return {
    /**
     * El recorrido por carretera que pasa, en orden, por points ({ latitude, longitude }).
     * Devuelve { line: [[lat, lon], ...], distanceKm, durationH }.
     */
    async route(points) {
      const path = points.map(({ latitude, longitude }) => `${longitude},${latitude}`).join(";");
      const target = new URL(`${url}/${path}`);
      target.searchParams.set("overview", "full");
      target.searchParams.set("geometries", "geojson");
      const { status, body } = await requestJson(fetchImpl, target, {
        service: SERVICE,
        timeoutMs,
        headers: { "user-agent": USER_AGENT },
      });
      const route = body?.routes?.[0];
      if (status !== 200 || body?.code !== "Ok" || !route?.geometry?.coordinates?.length) {
        throw upstreamError(SERVICE, { status });
      }
      return {
        // GeoJSON va en [lon, lat]; Leaflet y el resto del proyecto, en [lat, lon]
        line: route.geometry.coordinates.map(([lon, lat]) => [round(lat), round(lon)]),
        distanceKm: Math.round(route.distance / 100) / 10,
        durationH: Math.round(route.duration / 360) / 10,
      };
    },
  };
}

// 5 decimales son ~1 m: de sobra para dibujar, y la respuesta pesa la mitad
const round = (value) => Math.round(value * 1e5) / 1e5;
