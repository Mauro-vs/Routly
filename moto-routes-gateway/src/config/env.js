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

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),

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
  return Object.freeze({
    env: config.NODE_ENV,
    port: config.PORT,
    // Los servicios, en el orden en que se buscan por prefijo
    services: Object.freeze({
      api: Object.freeze({ name: "api", prefix: "/api", target: config.API_URL, timeoutMs: config.UPSTREAM_TIMEOUT_MS }),
      auth: Object.freeze({ name: "auth", prefix: "/auth", target: config.AUTH_URL, timeoutMs: config.UPSTREAM_TIMEOUT_MS }),
      ai: Object.freeze({ name: "ai", prefix: "/ai", target: config.AI_URL, timeoutMs: config.AI_TIMEOUT_MS }),
    }),
    healthTimeoutMs: config.HEALTH_TIMEOUT_MS,
    maxBodyBytes: config.MAX_BODY_BYTES,
    accessLog: config.ACCESS_LOG ? config.ACCESS_LOG === "true" : config.NODE_ENV !== "test",
  });
}
