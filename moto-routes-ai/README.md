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

## Estructura

```
src/
  server.js            solo arranca: lee la configuración y escucha
  app.js               monta la app (la usan server.js y los tests)
  config/env.js        la configuración del .env, comprobada con Zod
  clients/routly.js    la API de Routly (solo /api/shop)
  services/cache.js    caché en memoria con caducidad
  middlewares/         errores (mismo formato que la API), validación y límites por IP
  utils/               errores HTTP y peticiones JSON con tiempo máximo
  testing/helpers.js   un fetch falso y la app en un puerto libre
```

## Tests

```bash
npm test
```

No necesitan red ni MongoDB: un `fetch` falso contesta como la API y los demás servicios.
