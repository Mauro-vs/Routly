import { generateKeyPairSync } from "node:crypto";
import { createApp } from "../app.js";
import { loadConfig } from "../config/env.js";
import { loadKeys } from "../config/keys.js";
import { hashPassword } from "../utils/passwd.js";
import { createMemoryRepositories } from "./memoryRepositories.js";

/*
 * Ayudas de los tests: claves RSA de prueba (generadas al vuelo, nunca las de keys/), la
 * configuración de test, la app con los repositorios en memoria y un cliente HTTP con cookies.
 */

export const PASSWORD = "moto-1234";

export function generatePem(modulusLength = 2048) {
  return generateKeyPairSync("rsa", {
    modulusLength,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
}

// Una sola clave para todo el proceso: generar RSA tarda
const testPem = generatePem().privateKey;

export const testConfig = (env = {}) =>
  loadConfig({ NODE_ENV: "test", RATE_LIMIT: "false", JWT_PRIVATE_KEY: testPem, ...env });

let passwordHash;
export const testPasswordHash = async () => (passwordHash ??= await hashPassword(PASSWORD));

/**
 * Arranca la app en un puerto libre con un admin, un rider y un host desactivado.
 * clock: el reloj de la app, que los tests pueden adelantar (clock.advance(ms)).
 */
export async function startApp({ env = {}, config = testConfig(env) } = {}) {
  const keys = await loadKeys(config.jwt);
  const memory = createMemoryRepositories();
  const roles = {
    admin: memory.seed.role("admin"),
    rider: memory.seed.role("rider"),
    host: memory.seed.role("host"),
  };
  const hash = await testPasswordHash();
  const users = {
    admin: memory.seed.user({ name: "Admin", email: "admin@routly.dev", passwordHash: hash, role: roles.admin }),
    rider: memory.seed.user({ name: "Rider", email: "rider@routly.dev", passwordHash: hash, role: roles.rider }),
    inactive: memory.seed.user({ name: "Off", email: "off@routly.dev", passwordHash: hash, role: roles.host, isActive: false }),
  };

  const clock = { time: Date.now(), advance(ms) { this.time += ms; } };
  const app = createApp({ config, keys, repositories: memory.repositories, now: () => clock.time });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return {
    config,
    keys,
    db: memory.db,
    seed: memory.seed,
    roles,
    users,
    clock,
    baseUrl,
    client: () => createClient(baseUrl),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** Lee una cabecera Set-Cookie: { name, value, attributes } (atributos en minúsculas). */
export function parseSetCookie(header) {
  const [pair, ...rest] = header.split(";").map((part) => part.trim());
  const separator = pair.indexOf("=");
  const attributes = {};
  for (const attribute of rest) {
    const [key, ...value] = attribute.split("=");
    attributes[key.toLowerCase()] = value.length ? value.join("=") : true;
  }
  return { name: pair.slice(0, separator), value: decodeURIComponent(pair.slice(separator + 1)), attributes };
}

/**
 * Un cliente que guarda las cookies como un navegador (por nombre y Path) y las manda según la ruta.
 * Las borradas (Expires en el pasado) desaparecen.
 */
export function createClient(baseUrl) {
  const jar = new Map();

  async function request(path, { method = "GET", body, headers = {}, cookies = true } = {}) {
    const cookieHeader = [...jar.values()]
      .filter((cookie) => path.startsWith(cookie.path))
      // El navegador manda primero la de Path más largo
      .sort((a, b) => b.path.length - a.path.length)
      .map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
      .join("; ");

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { "content-type": "application/json" }),
        ...(cookies && cookieHeader && { cookie: cookieHeader }),
        ...headers,
      },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });

    const setCookies = response.headers.getSetCookie().map(parseSetCookie);
    for (const cookie of setCookies) {
      const key = `${cookie.name}|${cookie.attributes.path}`;
      const expired = cookie.attributes.expires && new Date(cookie.attributes.expires) <= new Date();
      if (expired || cookie.value === "") jar.delete(key);
      else jar.set(key, { name: cookie.name, value: cookie.value, path: cookie.attributes.path ?? "/" });
    }

    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: response.status, body: json, headers: response.headers, setCookies };
  }

  return {
    request,
    jar,
    cookie: (name) => [...jar.values()].find((cookie) => cookie.name === name)?.value,
    setCookie: (name, value, path = "/") => jar.set(`${name}|${path}`, { name, value, path }),
  };
}

export const login = (client, email = "rider@routly.dev", password = PASSWORD) =>
  client.request("/auth/login", { method: "POST", body: { email, password } });
