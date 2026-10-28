import jwt from "jsonwebtoken";

// En producción el secreto tiene que tener al menos 32 caracteres (256 bits para HS256)
const MIN_SECRET_LENGTH = 32;
const DEFAULT_EXPIRES_IN = "1h";

let config;

/**
 * Lee y comprueba JWT_SECRET y JWT_EXPIRES_IN. Se lee al usarse, no al importar: así
 * server.js lo llama al arrancar (y no arranca si falta algo) y los tests pueden fijar
 * las variables antes de la primera firma.
 */
export function loadAuthConfig() {
  if (config) return config;

  const secret = process.env.JWT_SECRET;
  const rawExpiresIn = process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN;
  // jsonwebtoken lee "3600" (texto sin unidad) como milisegundos: sin unidad son segundos
  const expiresIn = /^\d+$/.test(rawExpiresIn) ? Number(rawExpiresIn) : rawExpiresIn;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables (see .env.example)");
  }
  if (process.env.NODE_ENV === "production" && secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long in production`);
  }

  // jsonwebtoken acepta segundos o un texto como "7d" o "1h": se prueba aquí para que un
  // valor no válido pare el arranque y no el primer login
  try {
    jwt.sign({}, secret, { expiresIn });
  } catch {
    throw new Error(`JWT_EXPIRES_IN has an invalid value: "${expiresIn}" (use e.g. 1h or 7d)`);
  }

  config = Object.freeze({ secret, expiresIn });
  return config;
}
