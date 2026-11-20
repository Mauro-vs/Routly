import { createLocalJWKSet, createRemoteJWKSet } from "jose";

/*
 * Los tokens los firma el servicio de auth (moto-routes-auth, puerto 3002) con su clave privada
 * (RS256). La API solo los comprueba, con la clave pública que el servicio publica en su JWKS: no
 * tiene ningún secreto con el que pudiera fabricar un token.
 *
 *   AUTH_JWKS_URL  la URL del JWKS. Fuera de producción, por defecto el servicio de auth local;
 *                  en producción es obligatoria (por HTTPS o por la red interna)
 *   JWT_ISSUER     quién firma (iss). Por defecto routly-auth
 *   JWT_AUDIENCE   para quién (aud). Por defecto routly
 *
 * Se lee al usarse, no al importar: server.js la carga al arrancar (y no arranca si algo está
 * mal) y los tests pueden cambiar el JWKS por uno en memoria (useLocalKeySet).
 */
const DEFAULT_JWKS_URL = "http://localhost:3002/auth/.well-known/jwks.json";
const DEFAULT_ISSUER = "routly-auth";
const DEFAULT_AUDIENCE = "routly";

let config;
let keySet;

/** Lee y comprueba la configuración a partir de unas variables de entorno. */
export function authConfigFrom(env = process.env) {
  const isProduction = env.NODE_ENV === "production";
  const rawUrl = env.AUTH_JWKS_URL?.trim() || (isProduction ? "" : DEFAULT_JWKS_URL);
  if (!rawUrl) {
    throw new Error("AUTH_JWKS_URL is not defined in environment variables (see .env.example)");
  }

  let jwksUrl;
  try {
    jwksUrl = new URL(rawUrl);
  } catch {
    throw new Error(`AUTH_JWKS_URL has an invalid value: "${rawUrl}"`);
  }
  if (jwksUrl.protocol !== "https:" && jwksUrl.protocol !== "http:") {
    throw new Error(`AUTH_JWKS_URL has an invalid value: "${rawUrl}" (use http or https)`);
  }

  return Object.freeze({
    jwksUrl,
    issuer: env.JWT_ISSUER?.trim() || DEFAULT_ISSUER,
    audience: env.JWT_AUDIENCE?.trim() || DEFAULT_AUDIENCE,
  });
}

/** La configuración del proceso, leída una vez. */
export function loadAuthConfig() {
  config ??= authConfigFrom();
  return config;
}

/**
 * Las claves públicas con las que se comprueban los tokens. jose descarga el JWKS la primera vez,
 * lo guarda en caché 10 minutos y, si llega un token con un kid que no conoce (una clave rotada),
 * lo vuelve a pedir, pero como mucho una vez cada 30 s: un atacante no puede forzar descargas sin fin.
 */
export function getKeySet() {
  keySet ??= createRemoteJWKSet(loadAuthConfig().jwksUrl, {
    timeoutDuration: 5000,
    cooldownDuration: 30_000,
    cacheMaxAge: 10 * 60 * 1000,
  });
  return keySet;
}

/** Solo para los tests: comprobar con un JWKS en memoria en vez de pedirlo al servicio de auth. */
export function useLocalKeySet(jwks) {
  keySet = createLocalJWKSet(jwks);
}
