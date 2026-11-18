import { z } from "zod";

/*
 * La configuración del servidor de IA, leída del entorno (.env) y comprobada con Zod al arrancar:
 * mejor fallar aquí que en la primera petición. Todo tiene un valor por defecto que vale en
 * desarrollo salvo OPENROUTER_API_KEY: sin ella el servidor arranca igual, y lo que no usa IA (el
 * tiempo y las paradas) sigue funcionando.
 */

// Gratuitos (los ":free" de OpenRouter) y con herramientas, que el chat las necesita. Tienen
// límite de peticiones al día: la caché de 24 h de los textos ayuda a no llegar
const DEFAULT_MODELS = "meta-llama/llama-3.3-70b-instruct:free,mistralai/mistral-small-3.2-24b-instruct:free,qwen/qwen3-235b-a22b:free";

const milliseconds = (fallback) => z.coerce.number().int().min(100).max(120_000).default(fallback);
const url = (fallback) =>
  z
    .url({ protocol: /^https?$/ })
    .default(fallback)
    // Sin barra final: las rutas se le añaden con la suya
    .transform((value) => value.replace(/\/+$/, ""));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  // Número de proxies delante (Nginx, un PaaS, el futuro API gateway). Igual que en la API
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  // La API de Routly: solo se usa su parte pública, /api/shop
  ROUTLY_API_URL: url("http://localhost:3000/api"),
  // Lo que se espera a la API, a Open-Meteo y a OpenStreetMap
  UPSTREAM_TIMEOUT_MS: milliseconds(10_000),

  // OpenRouter: https://openrouter.ai/keys. Vacía = sin IA (503 en lo que la necesita)
  OPENROUTER_API_KEY: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null),
  OPENROUTER_URL: url("https://openrouter.ai/api/v1"),
  // Modelos separados por comas: el primero es el principal y el resto, los de reserva
  AI_MODELS: z
    .string()
    .default(DEFAULT_MODELS)
    .transform((value) =>
      value
        .split(",")
        .map((model) => model.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().regex(/^[\w.-]+\/[\w.:-]+$/, "must look like vendor/model")).min(1)),
  AI_TIMEOUT_MS: milliseconds(30_000),
  AI_MAX_TOKENS: z.coerce.number().int().min(100).max(8000).default(1200),
  // Cabeceras de atribución de OpenRouter (salen en sus estadísticas)
  SITE_URL: url("http://localhost:4300"),
});

/** Lee y comprueba la configuración. Lanza un Error legible si algo no vale. */
export function loadConfig(env = process.env) {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid configuration in .env:\n  ${problems.join("\n  ")}`);
  }
  const config = result.data;
  return Object.freeze({
    env: config.NODE_ENV,
    port: config.PORT,
    trustProxy: config.TRUST_PROXY,
    routlyApiUrl: config.ROUTLY_API_URL,
    upstreamTimeoutMs: config.UPSTREAM_TIMEOUT_MS,
    ai: Object.freeze({
      apiKey: config.OPENROUTER_API_KEY,
      baseUrl: config.OPENROUTER_URL,
      models: Object.freeze(config.AI_MODELS),
      timeoutMs: config.AI_TIMEOUT_MS,
      maxTokens: config.AI_MAX_TOKENS,
      siteUrl: config.SITE_URL,
    }),
  });
}
