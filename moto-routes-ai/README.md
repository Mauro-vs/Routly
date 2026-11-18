# moto-routes-ai

El servidor de IA de Routly. Añade a la web pública textos generados con IA, el tiempo y las paradas
de cada ruta, y un chatbot. **No tiene base de datos ni toca MongoDB**: lee los datos de la parte
pública de la API (`/api/shop`), como cualquier visitante.

- Puerto **3001**. Todo cuelga de `/ai` (la API, de `/api`): el proxy de la web, y el futuro API
  gateway, solo tienen que mandar cada prefijo a su servidor.
- IA con [OpenRouter](https://openrouter.ai): una sola clave para Gemini, Grok, Claude, GPT...
  El modelo se cambia en `AI_MODELS`, sin tocar código.
- Mismo stack que la API: Node 20.19+, Express 5, Zod, helmet y express-rate-limit, en JS ESM.

## Arrancar

```bash
cd moto-routes-ai
npm install
copy .env.example .env      # en Linux o macOS: cp .env.example .env
npm run dev
```

Sin `OPENROUTER_API_KEY` arranca igual: `GET /health` responde `{ "ok": true, "ai": false }` y lo
que usa IA responde 503. La API de Routly tiene que estar en marcha (`ROUTLY_API_URL`).

## Endpoints

Públicos y sin sesión, como la tienda. Responden `{ data }` y los errores con el formato de la API
(`{ statusCode, error, message, details? }`).

| Método y ruta | Qué devuelve | IA |
| --- | --- | --- |
| `GET /health` | `{ ok, ai }`: `ai` es `false` si falta la clave de OpenRouter | No |
| `GET /ai/experiences/:slug/weather` | El tiempo de las próximas salidas en el punto de salida ([Open-Meteo](https://open-meteo.com)): previsión si es dentro de 16 días (`kind: "forecast"`) y, si no, lo que hizo esos días el año pasado (`kind: "reference"`). Cada día con su texto, icono y avisos (`rain`, `cold`, `heat`, `wind`, `storm`) | No |
| `GET /ai/experiences/:slug/stops` | Dónde comer, gasolineras y miradores cerca de la salida y de la llegada ([OpenStreetMap](https://www.openstreetmap.org)), 5 de cada, con distancia y enlace al mapa. En una ruta circular, `end` es `null` | No |

Las coordenadas salen del detalle de la API. Si una ubicación no las tiene, se busca la ciudad en el
geocodificador de Open-Meteo. La previsión se guarda 1 hora, el histórico y las paradas 7 días.

## Estructura

```
src/
  server.js            solo arranca: lee la configuración y escucha
  app.js               monta la app (la usan server.js y los tests)
  config/env.js        la configuración del .env, comprobada con Zod
  clients/             los servicios de fuera, cada uno con su fetch y su tiempo máximo:
    routly.js          la API de Routly (solo /api/shop)
    weather.js         Open-Meteo: previsión, histórico y geocodificador
    overpass.js        OpenStreetMap: sitios cerca de un punto
  services/
    cache.js           caché en memoria con caducidad
    catalog.service.js la experiencia y sus salidas (un minuto en caché)
    places.service.js  las coordenadas de una ubicación (o las busca)
    weather.service.js el tiempo de las salidas; weatherCodes.js traduce los códigos
    stops.service.js   las paradas de la ruta
  routes/              los endpoints de /ai
  schemas/             los esquemas de Zod de las peticiones
  middlewares/         errores (mismo formato que la API), validación y límites por IP
  utils/               errores HTTP y peticiones JSON con tiempo máximo
  testing/             un fetch falso, la app en un puerto libre y datos de ejemplo
```

## Tests

```bash
npm test
```

No necesitan red ni MongoDB: un `fetch` falso contesta como la API y los demás servicios.
