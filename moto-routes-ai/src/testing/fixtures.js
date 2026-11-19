// Datos de ejemplo con la forma que devuelven la API de Routly, Open-Meteo y Overpass

export const NOW = Date.parse("2026-06-01T08:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const iso = (time) => new Date(time).toISOString();

export const jaca = { _id: "l1", city: "Jaca", region: "Aragón", country: "España", slug: "jaca-1", latitude: 42.57, longitude: -0.55 };
export const sabinanigo = { _id: "l2", city: "Sabiñánigo", region: "Aragón", country: "España", slug: "sabinanigo-2" };

export const experience = {
  _id: "e1",
  slug: "pirineo-en-moto",
  title: "Pirineo en moto",
  description: "Puertos de montaña con curvas enlazadas y paradas en pueblos de piedra.",
  meetingPoint: "Gasolinera de la entrada de Jaca",
  language: "es",
  duration: 8,
  minParticipants: 2,
  maxParticipants: 8,
  priceFrom: 120,
  nextDepartureAt: iso(NOW + 3 * DAY),
  route: {
    title: "Valle de Tena",
    distance: 180,
    duration: 5,
    difficulty: "medium",
    category: { name: "Montaña", slug: "montana-1" },
    startLocation: jaca,
    endLocation: sabinanigo,
  },
  host: { name: "Ana Rutas", slug: "ana-rutas-1", biography: "Guía desde 2010." },
  guideBike: { brand: "BMW", model: "R 1250 GS", license: "A" },
  images: [],
};

export const departures = [
  { slug: "pirineo-en-moto-260604", startAt: iso(NOW + 3 * DAY), endAt: iso(NOW + 3 * DAY + 8 * 3600_000), price: 120, seatsLeft: 4, isFull: false },
  { slug: "pirineo-en-moto-260801", startAt: iso(NOW + 61 * DAY), endAt: iso(NOW + 62 * DAY), price: 150, seatsLeft: 6, isFull: false },
];

// 16 días desde el 1 de junio: el 4 llueve
export function forecastBody() {
  const time = Array.from({ length: 16 }, (_, index) => iso(NOW + index * DAY).slice(0, 10));
  return {
    timezone: "Europe/Madrid",
    daily: {
      time,
      weather_code: time.map((date) => (date === "2026-06-04" ? 63 : 1)),
      temperature_2m_max: time.map(() => 24),
      temperature_2m_min: time.map(() => 11),
      precipitation_sum: time.map((date) => (date === "2026-06-04" ? 8 : 0)),
      precipitation_probability_max: time.map((date) => (date === "2026-06-04" ? 80 : 5)),
      wind_speed_10m_max: time.map(() => 15),
    },
  };
}

export function archiveBody(url) {
  const start = url.searchParams.get("start_date");
  const end = url.searchParams.get("end_date");
  const time = [];
  for (let t = Date.parse(start); t <= Date.parse(end); t += DAY) time.push(iso(t).slice(0, 10));
  return {
    timezone: "Europe/Madrid",
    daily: {
      time,
      weather_code: time.map(() => 0),
      temperature_2m_max: time.map(() => 36),
      temperature_2m_min: time.map(() => 18),
      precipitation_sum: time.map(() => 0),
      wind_speed_10m_max: time.map(() => 10),
    },
  };
}

export const geocodingBody = {
  results: [
    { name: "Sabiñánigo", latitude: 9.9, longitude: 9.9, country: "Venezuela", admin1: "Otra" },
    { name: "Sabiñánigo", latitude: 42.52, longitude: -0.36, country: "España", admin1: "Aragón" },
  ],
};

export const overpassBody = {
  elements: [
    { type: "node", id: 1, lat: 42.571, lon: -0.551, tags: { amenity: "restaurant", name: "Casa Fau", cuisine: "spanish;local", opening_hours: "Mo-Su 13:00-16:00" } },
    { type: "way", id: 2, center: { lat: 42.6, lon: -0.5 }, tags: { amenity: "fuel", brand: "Repsol" } },
    { type: "node", id: 3, lat: 42.58, lon: -0.56, tags: { amenity: "fuel" } },
    { type: "node", id: 4, lat: 42.7, lon: -0.4, tags: { tourism: "viewpoint" } },
    { type: "node", id: 5, lat: 42.65, lon: -0.45, tags: { tourism: "viewpoint", name: "Mirador de la Peña Oroel" } },
    { type: "node", id: 6, lat: 42.57, lon: -0.55, tags: { shop: "bakery", name: "No es una parada" } },
  ],
};

// Una respuesta buena de la IA para el bloque Routly IA
export const insightsAnswer = {
  summary: "Un día de puertos en el Pirineo aragonés con un guía local.",
  highlights: ["Curvas enlazadas en el Valle de Tena", "Paradas en pueblos de piedra", "Grupo de 8 como mucho"],
  idealFor: { level: "Piloto con algo de experiencia en montaña.", rider: "Para quien disfruta de las curvas.", bike: "Una trail o una naked; carnet A." },
  packing: ["Chaqueta impermeable", "Guantes de media estación", "Capa térmica", "Agua"],
  faq: [
    { question: "¿Cuántos km son?", answer: "180 km, unas 5 horas conduciendo." },
    { question: "¿Dónde se sale?", answer: "De la gasolinera de la entrada de Jaca." },
    { question: "¿Cuánto cuesta?", answer: "Desde 120 euros por persona." },
  ],
};

/** El cuerpo de una respuesta de OpenRouter (sin streaming) con ese texto. */
export const completion = (content, model = "google/gemini-2.5-flash") => ({
  id: "gen-1",
  model,
  choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content } }],
  usage: { prompt_tokens: 900, completion_tokens: 400, total_tokens: 1300 },
});

// Lo que devuelve el reverse de Photon cerca de Jaca: responde según los osm_tag que se le piden
const photonPlaces = [
  { osm_type: "N", osm_id: 11, osm_key: "amenity", osm_value: "restaurant", name: "Casa Fau", lat: 42.571, lon: -0.551 },
  { osm_type: "W", osm_id: 12, osm_key: "amenity", osm_value: "cafe", name: "Café Pirineo", lat: 42.6, lon: -0.4 },
  { osm_type: "N", osm_id: 13, osm_key: "amenity", osm_value: "restaurant", lat: 42.572, lon: -0.552 },
  { osm_type: "N", osm_id: 14, osm_key: "amenity", osm_value: "fuel", name: "Repsol", lat: 42.58, lon: -0.56 },
  { osm_type: "N", osm_id: 15, osm_key: "tourism", osm_value: "viewpoint", name: "Mirador de la Peña Oroel", lat: 42.62, lon: -0.33 },
  { osm_type: "N", osm_id: 16, osm_key: "amenity", osm_value: "bar", name: "Bar Lo Fogaril", lat: 42.5705, lon: -0.5505 },
];

export function photonBody(url) {
  const wanted = new Set(url.searchParams.getAll("osm_tag"));
  return {
    type: "FeatureCollection",
    features: photonPlaces
      .filter((place) => wanted.has(`${place.osm_key}:${place.osm_value}`))
      .map(({ lat, lon, ...properties }) => ({ type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties })),
  };
}
