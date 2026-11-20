import { z } from "zod";

/*
 * La configuración del servicio de auth, leída del entorno (.env) y comprobada con Zod al
 * arrancar: mejor fallar aquí que en el primer login. Todo tiene un valor por defecto que vale en
 * desarrollo; la clave privada sale de keys/private.pem (npm run keys) si no llega por el entorno.
 */

const DURATION_UNITS = { s: 1, m: 60, h: 3600, d: 86_400 };

/** "900", "15m", "1h", "7d" → segundos. Sin unidad, segundos (no milisegundos como jsonwebtoken). */
export function parseDuration(value) {
  const match = /^(\d+)\s*([smhd]?)$/.exec(String(value).trim());
  if (!match) return null;
  return Number(match[1]) * DURATION_UNITS[match[2] || "s"];
}

const duration = (fallback, { min, max }) =>
  z
    .string()
    .default(fallback)
    .transform((value, ctx) => {
      const seconds = parseDuration(value);
      if (seconds === null || seconds < min || seconds > max) {
        ctx.addIssue({ code: "custom", message: `must be a duration between ${min}s and ${max}s (e.g. 15m, 7d)` });
        return z.NEVER;
      }
      return seconds;
    });

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null);

const booleanText = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === "true"));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3002),
  // Número de proxies delante (Nginx, un PaaS, el futuro API gateway). 0 sin proxy: si no, cualquiera
  // podría inventarse su IP (X-Forwarded-For) y saltarse el límite de intentos del login
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  MONGODB_URI: z.string().trim().min(1).default("mongodb://localhost:27017/moto_routes"),

  // Orígenes del panel y la web, separados por comas: CORS en producción y la comprobación CSRF
  CORS_ORIGIN: z.string().default(""),

  // Quién firma (iss) y para quién (aud). La API, la IA y la gateway comprueban los dos
  JWT_ISSUER: z.string().trim().min(1).default("routly-auth"),
  JWT_AUDIENCE: z.string().trim().min(1).default("routly"),
  // El token de acceso es corto; el refresh lo renueva sin volver a pedir la contraseña
  ACCESS_TOKEN_TTL: duration("15m", { min: 60, max: 86_400 }),
  REFRESH_TOKEN_TTL: duration("7d", { min: 3600, max: 90 * 86_400 }),

  // La clave privada RSA en PEM (PKCS#8). En producción, por el entorno (con \n escapados si hace
  // falta); en desarrollo, el archivo que crea npm run keys
  JWT_PRIVATE_KEY: optionalText,
  JWT_PRIVATE_KEY_FILE: z.string().trim().default("keys/private.pem"),
  // Al rotar: la clave pública anterior sigue en el JWKS hasta que caducan sus tokens
  JWT_PREVIOUS_PUBLIC_KEY_FILE: optionalText,

  // Cookies: Secure por defecto en producción; SameSite strict (o lax)
  COOKIE_SECURE: booleanText,
  COOKIE_SAMESITE: z.enum(["strict", "lax"]).default("strict"),
  // El token en el body del login (Swagger, Postman, tests). Por defecto, no en producción
  TOKEN_IN_BODY: booleanText,
  // El límite de intentos del login, el registro y el refresh. Solo se apaga en los tests
  RATE_LIMIT: booleanText,
});

const splitList = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/** Lee y comprueba la configuración. Lanza un Error legible si algo no vale. */
export function loadConfig(env = process.env) {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid configuration in .env:\n  ${problems.join("\n  ")}`);
  }
  const config = result.data;
  const isProduction = config.NODE_ENV === "production";
  const secure = config.COOKIE_SECURE ?? isProduction;

  if (isProduction && !secure) {
    throw new Error("Invalid configuration in .env:\n  COOKIE_SECURE: must be true in production (HTTPS)");
  }

  return Object.freeze({
    env: config.NODE_ENV,
    port: config.PORT,
    trustProxy: config.TRUST_PROXY,
    mongodbUri: config.MONGODB_URI,
    corsOrigins: Object.freeze(splitList(config.CORS_ORIGIN)),
    jwt: Object.freeze({
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
      accessTtl: config.ACCESS_TOKEN_TTL,
      refreshTtl: config.REFRESH_TOKEN_TTL,
      privateKey: config.JWT_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? null,
      privateKeyFile: config.JWT_PRIVATE_KEY_FILE,
      previousPublicKeyFile: config.JWT_PREVIOUS_PUBLIC_KEY_FILE,
    }),
    cookies: Object.freeze({ secure, sameSite: config.COOKIE_SAMESITE }),
    tokenInBody: config.TOKEN_IN_BODY ?? !isProduction,
    rateLimit: config.RATE_LIMIT ?? true,
    swagger: !isProduction,
  });
}
