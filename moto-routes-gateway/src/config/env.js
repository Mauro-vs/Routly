import { z } from "zod";

/*
 * La configuración de la gateway, leída del entorno (.env) y comprobada con Zod al arrancar: mejor
 * fallar aquí que en la primera petición. Todo tiene un valor por defecto que vale en desarrollo,
 * con los servicios en su puerto de siempre en esta misma máquina.
 */

const milliseconds = (fallback) => z.coerce.number().int().min(100).max(600_000).default(fallback);
const url = (fallback) =>
  z
    .url({ protocol: /^https?$/ })
    .default(fallback)
    // Sin barra final: la ruta de la petición se le añade tal cual
    .transform((value) => value.replace(/\/+$/, ""));

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null);
const bool = (fallback) =>
  z
    .enum(["true", "false"])
    .default(String(fallback))
    .transform((value) => value === "true");
// Un nombre de host, sin puerto ni protocolo: routly.localhost
const hostname = (fallback) =>
  z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/, "must be a host name, without port or protocol")
    .default(fallback);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),

  // HTTPS con el certificado de certs/ (npm run certs, o el de mkcert). false solo para depurar
  HTTPS: bool(true),
  TLS_CERT_FILE: z.string().trim().min(1).default("certs/cert.pem"),
  TLS_KEY_FILE: z.string().trim().min(1).default("certs/key.pem"),
  // Opcional: un puerto HTTP que solo redirige (301) a HTTPS. Sin definir, no se abre
  HTTP_PORT: z.coerce.number().int().min(1).max(65_535).optional(),

  // Los dos frontales, cada uno en su nombre. Los *.localhost apuntan a este equipo sin tocar el
  // archivo hosts, y cada nombre tiene sus cookies: la web y el panel, cada uno con su sesión
  WEB_HOST: hostname("routly.localhost"),
  PANEL_HOST: hostname("panel.routly.localhost"),
  // En desarrollo, su ng serve (con el live reload por WebSocket)...
  WEB_URL: url("http://localhost:4300"),
  PANEL_URL: url("http://localhost:4200"),
  // ...o, si se indica, la carpeta de su build (ng build), que sirve la gateway
  WEB_DIST: optionalText,
  PANEL_DIST: optionalText,

  // Dónde está cada servicio. Por la red interna: el navegador nunca habla con ellos directamente
  API_URL: url("http://127.0.0.1:3000"),
  AUTH_URL: url("http://127.0.0.1:3002"),
  AI_URL: url("http://127.0.0.1:3001"),

  // Lo que se espera a que un servicio conteste (sin recibir nada) antes de dar un 504
  UPSTREAM_TIMEOUT_MS: milliseconds(15_000),
  // La IA tarda más: escribir los textos lleva hasta ~75 s (el aiTimeout de la web)
  AI_TIMEOUT_MS: milliseconds(90_000),
  // Lo que espera /gateway/ready a cada /health
  HEALTH_TIMEOUT_MS: milliseconds(2_000),

  // El token en la puerta: la clave pública de auth (su JWKS) y lo que tiene que decir el token.
  // Sin definir, el JWKS es el de AUTH_URL. Emisor y audiencia, los mismos que en auth y la API
  AUTH_JWKS_URL: z.url({ protocol: /^https?$/ }).optional(),
  JWT_ISSUER: z.string().trim().min(1).default("routly-auth"),
  JWT_AUDIENCE: z.string().trim().min(1).default("routly"),

  // Límite general por IP para /api, /auth y /ai (los frontales no cuentan)...
  RATE_LIMIT_WINDOW_MS: milliseconds(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
  // ...y uno más estricto para lo que gasta cuota de la IA (el chat y los textos)
  AI_RATE_LIMIT_WINDOW_MS: milliseconds(600_000),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(30),

  // Tope del cuerpo de una petición, por su Content-Length (413). La gateway no lo lee: lo reenvía
  MAX_BODY_BYTES: z.coerce.number().int().min(1_024).default(1_048_576),

  // El registro de acceso (una línea JSON por petición). Sin definir: sí, salvo en los tests
  ACCESS_LOG: z.enum(["true", "false"]).optional(),
});

/** Lee y comprueba la configuración. Lanza un Error legible si algo no vale. */
export function loadConfig(env = process.env) {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid configuration in .env:\n  ${problems.join("\n  ")}`);
  }
  const config = result.data;
  if (config.WEB_HOST === config.PANEL_HOST) {
    throw new Error("Invalid configuration in .env:\n  WEB_HOST and PANEL_HOST must be different");
  }
  return Object.freeze({
    env: config.NODE_ENV,
    port: config.PORT,
    https: config.HTTPS,
    tls: Object.freeze({ certFile: config.TLS_CERT_FILE, keyFile: config.TLS_KEY_FILE }),
    httpPort: config.HTTP_PORT ?? null,
    frontends: Object.freeze({
      web: Object.freeze({ name: "web", host: config.WEB_HOST, target: config.WEB_URL, dist: config.WEB_DIST }),
      panel: Object.freeze({ name: "panel", host: config.PANEL_HOST, target: config.PANEL_URL, dist: config.PANEL_DIST }),
    }),
    // Los servicios, en el orden en que se buscan por prefijo
    services: Object.freeze({
      api: Object.freeze({ name: "api", prefix: "/api", target: config.API_URL, timeoutMs: config.UPSTREAM_TIMEOUT_MS }),
      auth: Object.freeze({ name: "auth", prefix: "/auth", target: config.AUTH_URL, timeoutMs: config.UPSTREAM_TIMEOUT_MS }),
      ai: Object.freeze({ name: "ai", prefix: "/ai", target: config.AI_URL, timeoutMs: config.AI_TIMEOUT_MS }),
    }),
    auth: Object.freeze({
      jwksUrl: config.AUTH_JWKS_URL ?? `${config.AUTH_URL}/auth/.well-known/jwks.json`,
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
    }),
    rateLimits: Object.freeze({
      general: Object.freeze({ name: "general", limit: config.RATE_LIMIT_MAX, windowMs: config.RATE_LIMIT_WINDOW_MS }),
      ai: Object.freeze({ name: "ai", limit: config.AI_RATE_LIMIT_MAX, windowMs: config.AI_RATE_LIMIT_WINDOW_MS }),
    }),
    // HSTS solo en producción: en localhost, con un certificado autofirmado, dejaría el navegador
    // sin el botón de "Continuar" (y valdría para todos los puertos de localhost)
    hsts: config.NODE_ENV === "production" && config.HTTPS,
    healthTimeoutMs: config.HEALTH_TIMEOUT_MS,
    maxBodyBytes: config.MAX_BODY_BYTES,
    accessLog: config.ACCESS_LOG ? config.ACCESS_LOG === "true" : config.NODE_ENV !== "test",
  });
}
