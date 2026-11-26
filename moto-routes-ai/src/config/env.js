import { z } from "zod";

/*
 * La configuración del servidor de IA, leída del entorno (.env) y comprobada con Zod al arrancar:
 * mejor fallar aquí que en la primera petición. Todo tiene un valor por defecto que vale en
 * desarrollo salvo la clave de la IA (AI_API_KEY): sin ella el servidor arranca igual, y lo que no
 * usa IA (el tiempo y las paradas) sigue funcionando.
 */

/*
 * Los proveedores de IA que se pueden usar: todos hablan la API de OpenAI (/chat/completions), así
 * que solo cambian la URL y los nombres de los modelos. Los modelos por defecto son gratuitos y
 * admiten herramientas (el chat las necesita); el primero es el principal y el resto, de reserva.
 * - groq: gratis con límites por minuto y por día, y muy rápido. https://console.groq.com/keys
 * - gemini: Google AI Studio, gratis con límites. https://aistudio.google.com/apikey
 * - openrouter: los ":free", que cambian a menudo (se comprueban en su catálogo al arrancar).
 */
export const AI_PROVIDERS = Object.freeze({
  groq: { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", models: "openai/gpt-oss-120b,qwen/qwen3.8-27b" },
  gemini: {
    label: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: "gemini-2.5-flash,gemini-2.5-flash-lite",
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: "meta-llama/llama-3.3-70b-instruct:free,mistralai/mistral-small-3.2-24b-instruct:free",
  },
});

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null);
const modelList = (value) =>
  value
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

// Modelos separados por comas: el primero es el principal y el resto, los de reserva. Vacío = null
const modelsSchema = z
  .string()
  .optional()
  .transform((value) => (value ? modelList(value) : null))
  .pipe(z.array(z.string().regex(/^[\w.:/-]+$/, "must be model names separated by commas")).min(1).nullable());

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

  // El proveedor de IA (arriba) y su clave. Sin clave = sin IA (503 en lo que la necesita)
  AI_PROVIDER: z.enum(Object.keys(AI_PROVIDERS)).default("groq"),
  AI_API_KEY: optionalText,
  // La clave de antes, para OpenRouter: sigue valiendo si no hay AI_API_KEY
  OPENROUTER_API_KEY: optionalText,
  // Otra URL compatible con OpenAI, si hace falta (por defecto, la del proveedor)
  AI_BASE_URL: z.url({ protocol: /^https?$/ }).optional(),
  // Modelos separados por comas: el primero es el principal y el resto, los de reserva. Vacío = los
  // del proveedor
  AI_MODELS: modelsSchema,
  // Opcional: los modelos del agente de resumen de opiniones. Vacío = los de AI_MODELS
  AI_MODELS_REVIEWS: modelsSchema,
  AI_TIMEOUT_MS: milliseconds(30_000),
  // Opcional: la clave gratuita de Geoapify (sitios de OpenStreetMap, más fiable que Photon y Overpass)
  GEOAPIFY_API_KEY: optionalText,
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
  const provider = AI_PROVIDERS[config.AI_PROVIDER];
  return Object.freeze({
    env: config.NODE_ENV,
    port: config.PORT,
    trustProxy: config.TRUST_PROXY,
    routlyApiUrl: config.ROUTLY_API_URL,
    upstreamTimeoutMs: config.UPSTREAM_TIMEOUT_MS,
    geoapifyApiKey: config.GEOAPIFY_API_KEY ?? null,
    ai: Object.freeze({
      provider: config.AI_PROVIDER,
      label: provider.label,
      apiKey: config.AI_API_KEY ?? (config.AI_PROVIDER === "openrouter" ? config.OPENROUTER_API_KEY : null),
      baseUrl: (config.AI_BASE_URL ?? provider.baseUrl).replace(/\/+$/, ""),
      models: Object.freeze(config.AI_MODELS ?? modelList(provider.models)),
      // Los de cada agente, si tiene los suyos (null = los de arriba)
      reviewsModels: config.AI_MODELS_REVIEWS ? Object.freeze(config.AI_MODELS_REVIEWS) : null,
      timeoutMs: config.AI_TIMEOUT_MS,
      maxTokens: config.AI_MAX_TOKENS,
      siteUrl: config.SITE_URL,
      // Comprobar los modelos en el catálogo de OpenRouter (en los tests no: no hay red)
      checkModels: config.AI_PROVIDER === "openrouter" && config.NODE_ENV !== "test",
    }),
  });
}
