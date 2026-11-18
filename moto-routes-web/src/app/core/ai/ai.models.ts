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
