# moto-routes-ai

El servidor de IA de Routly. Añade a la web pública textos generados con IA, el tiempo y las paradas
de cada ruta, y un chatbot. **No tiene base de datos ni toca MongoDB**: lee los datos de la parte
pública de la API (`/api/shop`), como cualquier visitante.

- Puerto **3001**. Todo cuelga de `/ai` (la API, de `/api`): el proxy de la web, y el futuro API
  gateway, solo tienen que mandar cada prefijo a su servidor.
- IA gratuita con [Groq](https://console.groq.com) (GPT-OSS 120B, y Qwen de reserva):
  sin tarjeta y muy rápida. Cualquier API compatible con la de OpenAI vale igual: con
  `AI_PROVIDER` se cambia a Gemini (Google AI Studio) u OpenRouter, y con `AI_MODELS`, los
  modelos, sin tocar código. Si un modelo está saturado (429) o falla, se prueba el siguiente.
- Mismo stack que la API: Node 20.19+, Express 5, Zod, helmet y express-rate-limit, en JS ESM.

## Arrancar

```bash
cd moto-routes-ai
npm install
copy .env.example .env      # en Linux o macOS: cp .env.example .env
npm run dev
```

Sin `AI_API_KEY` arranca igual: `GET /health` responde `{ "ok": true, "ai": false }` y lo
que usa IA responde 503. La API de Routly tiene que estar en marcha (`ROUTLY_API_URL`).

Los restaurantes, miradores y gasolineras del mapa salen de OpenStreetMap. Con `GEOAPIFY_API_KEY`
(gratis en https://myprojects.geoapify.com, 3000 peticiones al día y sin tarjeta) salen de Geoapify,
que responde siempre; sin ella, de Photon y Overpass, que no piden clave pero a menudo no responden.

## Endpoints

Públicos y sin sesión, como la tienda. Responden `{ data }` y los errores con el formato de la API
(`{ statusCode, error, message, details? }`).

| Método y ruta | Qué devuelve | IA |
| --- | --- | --- |
| `GET /health` | `{ ok, ai }`: `ai` es `false` si falta la clave de la IA | No |
| `GET /ai/experiences/:slug/insights` | Los textos IA del detalle: `summary`, `highlights`, `idealFor { level, rider, bike }`, `packing` y `faq [{ question, answer }]`, con el `model` que los ha escrito, `generatedAt` y `basedOn { weather, stops }`. Una sola llamada a la IA, que responde JSON comprobado con Zod (si no vale, se pide otra vez; a la segunda, 502). Sin clave, 503 | Sí |
| `GET /ai/experiences/:slug/weather` | El tiempo de las próximas salidas en el punto de salida ([Open-Meteo](https://open-meteo.com)): previsión si es dentro de 16 días (`kind: "forecast"`) y, si no, lo que hizo esos días el año pasado (`kind: "reference"`). Cada día con su texto, icono y avisos (`rain`, `cold`, `heat`, `wind`, `storm`) | No |
| `GET /ai/experiences/:slug/stops` | Dónde comer, gasolineras y miradores cerca de la salida y de la llegada ([OpenStreetMap](https://www.openstreetmap.org), por [Geoapify](https://www.geoapify.com) si hay `GEOAPIFY_API_KEY`, si no por [Photon](https://photon.komoot.io), y si falla, Overpass), 5 de cada, con distancia y enlace al mapa. En una ruta circular, `end` es `null` | No |
| `GET /ai/experiences/:slug/route` | El mapa del detalle: el recorrido por carretera ([OSRM](https://project-osrm.org)) desde la salida, por los `waypoints` de la ruta y hasta la llegada (`line` en `[lat, lon]`, `distanceKm`, `durationH`), y lo que hay a lo largo (`places`, cada uno con su `kind`): dónde comer a menos de 1,5 km, miradores a menos de 3 y gasolineras a menos de 2, repartidos por el recorrido. Si OSRM falla, la línea une los puntos en recto (`routed: false`). A los sitios se les espera 6 s: si tardan más, `places: null` y `placesStatus: "loading"` (la búsqueda sigue y la web vuelve a pedirlo); si fallan, `"unavailable"`. Una ruta circular sin puntos de paso no tiene `line`. El recorrido se guarda 30 días y los sitios 7 | No |

| `POST /ai/chat` | El chatbot, en streaming (`text/event-stream`). Body: `{ messages: [{ role: "user" \| "assistant", content }], experienceSlug? }`, 20 mensajes de 2.000 caracteres como mucho y el último del usuario. Eventos: `tool { name, label }`, `delta { text }`, `done { model }` y `error { message }` | Sí |

Las coordenadas salen del detalle de la API. Si una ubicación no las tiene, se busca la ciudad en el
geocodificador de Open-Meteo. La previsión se guarda 1 hora, el histórico y las paradas 7 días.

Los textos IA se escriben con los datos de la API, el tiempo y las paradas (si el tiempo o
OpenStreetMap fallan, se escriben sin ellos) y se guardan 24 horas. La clave de la caché lleva un hash
de los datos: si cambias la descripción en el panel, la siguiente visita los vuelve a escribir. Así, mil
visitas a una ficha cuestan una sola llamada a la IA. El prompt está en `src/prompts/insights.prompt.js`:
la IA solo redacta con los datos que se le pasan y no se inventa sitios, precios ni servicios.

## El chatbot

Es un agente con herramientas (*tool calling*): el modelo contesta o pide una herramienta, el
servidor la ejecuta y le devuelve el resultado, como mucho 5 rondas por pregunta (la última sin
herramientas, para que conteste sí o sí). Todas son de solo lectura (`src/tools/index.js`):

| Herramienta | Qué consulta |
| --- | --- |
| `buscar_experiencias` | `GET /api/shop/experiences` con filtros: texto, categoría, destino, dificultad, fechas, precio y orden |
| `ver_experiencia` | El detalle de una experiencia |
| `ver_salidas` | Sus salidas reservables, con plazas libres |
| `listar_categorias` y `listar_destinos` | Los carruseles de la Home, con los slugs para filtrar |
| `tiempo_experiencia` y `paradas_experiencia` | Lo mismo que `/weather` y `/stops` |

Lo que manda el modelo se comprueba con Zod antes de ejecutar nada. Si algo falla (argumentos que
no valen, una experiencia que no existe, un servicio caído), el error vuelve al modelo, no al
usuario, para que lo explique o pruebe otra cosa. Con `experienceSlug` (el chat del detalle), el
prompt ya lleva los datos de esa experiencia. El historial lo guarda la web: el servidor no guarda
nada. El cliente nunca puede mandar el prompt de sistema (solo mensajes `user` y `assistant`), y
si cierra el chat, se deja de pedir a la IA.

Límites por IP: 20 mensajes cada 10 minutos en el chat y 60 peticiones cada 15 minutos en
`/ai/experiences`.

## Estructura

```
src/
  server.js            solo arranca: lee la configuración y escucha
  app.js               monta la app (la usan server.js y los tests)
  config/env.js        la configuración del .env, comprobada con Zod
  clients/             los servicios de fuera, cada uno con su fetch y su tiempo máximo:
    routly.js          la API de Routly (solo /api/shop)
    openrouter.js      La IA: Groq, Gemini u OpenRouter (con los modelos de reserva de AI_MODELS)
    weather.js         Open-Meteo: previsión, histórico y geocodificador
    geoapify.js        Geoapify Places: los sitios de un tipo alrededor de un punto (con clave gratuita)
    photon.js          Photon: los sitios de un tipo más cercanos a un punto (OpenStreetMap, rápido)
    overpass.js        Overpass: lo mismo, de reserva (más lento, con horario y cocina)
    osrm.js            OSRM: el recorrido por carretera entre varios puntos
  services/
    cache.js           caché en memoria con caducidad
    catalog.service.js la experiencia y sus salidas (un minuto en caché)
    places.service.js  las coordenadas de una ubicación (o las busca)
    weather.service.js el tiempo de las salidas; weatherCodes.js traduce los códigos
    stops.service.js   las paradas de la ruta
    pois.service.js    de dónde salen los sitios: Geoapify (con clave), Photon y, si fallan, Overpass
    routeMap.service.js el mapa: recorrido y sitios a lo largo
    facts.js           los datos que se le pasan a la IA, resumidos
    insights.service.js los textos IA del detalle
    chat.service.js    el bucle del agente del chatbot
  tools/               las herramientas del chatbot
  prompts/             las instrucciones de la IA (textos del detalle y chatbot)
  routes/              los endpoints de /ai
  schemas/             los esquemas de Zod de las peticiones
  middlewares/         errores (mismo formato que la API), validación y límites por IP
  utils/               errores HTTP, peticiones JSON con tiempo máximo, distancias, el JSON de la IA y el streaming (SSE)
  testing/             un fetch falso, la app en un puerto libre y datos de ejemplo
```

## Tests

```bash
npm test
```

No necesitan red ni MongoDB: un `fetch` falso contesta como la API y los demás servicios.
