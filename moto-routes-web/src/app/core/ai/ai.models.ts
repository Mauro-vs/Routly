/*
 * Lo que devuelve el servidor de IA (moto-routes-ai, /ai). El contrato está en su README.
 */

export interface AiInsights {
  summary: string;
  highlights: string[];
  idealFor: { level: string; rider: string; bike: string };
  packing: string[];
  faq: { question: string; answer: string }[];
  /** El modelo que lo ha escrito (google/gemini-2.5-flash...) */
  model: string;
  generatedAt: string;
  basedOn: { weather: boolean; stops: boolean };
}

/** De qué se habla en las opiniones y cómo (GET /ai/{experiences|hosts}/:slug/reviews-summary). */
export interface AiReviewTopic {
  name: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  /** En cuántas opiniones sale */
  mentions: number;
}

/** El resumen IA de las opiniones. null si no hay bastantes con comentario (menos de 3). */
export interface AiReviewsSummary {
  summary: string;
  /** Lo que más gusta */
  pros: string[];
  /** Lo que se puede mejorar (vacío si no hay quejas) */
  cons: string[];
  topics: AiReviewTopic[];
  /** Cuántas opiniones ha leído la IA */
  basedOn: number;
  model: string;
  generatedAt: string;
}

export type WeatherIcon = 'sun' | 'cloud-sun' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm' | 'unknown';
export type WeatherWarning = 'rain' | 'cold' | 'heat' | 'wind' | 'storm';

export interface AiWeatherDay {
  date: string;
  code: number | null;
  label: string;
  icon: WeatherIcon;
  /** °C */
  max: number | null;
  min: number | null;
  /** mm */
  precipitation: number | null;
  /** % (solo en la previsión) */
  rainChance: number | null;
  /** km/h */
  wind: number | null;
  warnings: WeatherWarning[];
}

export interface AiDepartureWeather {
  slug: string | null;
  startAt: string;
  endAt: string | null;
  /** forecast: previsión; reference: lo que hizo esos días el año pasado */
  kind: 'forecast' | 'reference';
  referenceYear?: number;
  days: AiWeatherDay[];
}

export interface AiPlace {
  city: string;
  region: string | null;
  latitude: number;
  longitude: number;
}

export interface AiWeather {
  place: AiPlace;
  timezone: string;
  departures: AiDepartureWeather[];
}

export interface AiStop {
  name: string | null;
  category: string | null;
  cuisine: string[];
  brand: string | null;
  openingHours: string | null;
  distanceKm: number;
  url: string;
}

export interface AiStopsAround {
  place: AiPlace;
  food: AiStop[];
  fuel: AiStop[];
  viewpoints: AiStop[];
}

export interface AiStops {
  start: AiStopsAround;
  end: AiStopsAround | null;
  source: { name: string; url: string; attribution: string };
}

export type AiPlaceKind = 'food' | 'viewpoint' | 'fuel';

/** Un sitio a lo largo del recorrido: dónde comer, un mirador o una gasolinera */
export interface AiRoutePlace {
  kind: AiPlaceKind;
  /** Puede faltar en un mirador o una gasolinera */
  name: string | null;
  /** restaurant o cafe (solo los de comer) */
  category: string | null;
  cuisine: string[];
  openingHours: string | null;
  website: string | null;
  latitude: number;
  longitude: number;
  /** Lo lejos que queda del recorrido, en línea recta */
  distanceKm: number;
  /** Por dónde del recorrido cae: 0 es la salida y 1, la llegada */
  position: number;
  url: string;
}

export interface AiRouteMap {
  start: AiPlace;
  /** null si la ruta es circular */
  end: AiPlace | null;
  waypoints: { name: string | null; latitude: number; longitude: number }[];
  /** El recorrido, en [lat, lon]. null: ruta circular sin puntos de paso (solo la salida) */
  line: [number, number][] | null;
  /** false: OSRM no ha respondido y la línea une los puntos en recto */
  routed: boolean;
  distanceKm: number | null;
  durationH: number | null;
  /** null mientras se buscan (loading) o si no se han podido buscar (unavailable) */
  places: AiRoutePlace[] | null;
  placesStatus: 'ok' | 'loading' | 'unavailable';
  /** A cuántos km del recorrido se busca cada tipo */
  placesRadiusKm: Record<AiPlaceKind, number>;
  sources: {
    map: { name: string; url: string; attribution: string };
    route: { name: string; url: string };
    /** Solo si los sitios salen de Geoapify, que pide que se le cite */
    places?: { name: string; url: string };
  };
}

/** Un mensaje del chat, como lo manda la web (el servidor solo admite estos dos papeles). */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Los eventos del streaming de POST /ai/chat. */
export type ChatEvent =
  | { event: 'tool'; data: { name: string; label: string } }
  | { event: 'delta'; data: { text: string } }
  | { event: 'done'; data: { model: string | null } }
  | { event: 'error'; data: { message: string } };
