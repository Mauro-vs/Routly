import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { GATEWAY_ROOT } from "../servers.js";
import { requiresSession } from "./policies.js";

/*
 * La tabla de políticas tiene que decir lo mismo que las rutas de verdad. Este test lee las rutas
 * de la API y de auth (sus archivos, sin arrancarlas) y comprueba, una a una, que la gateway exige
 * sesión justo en las que la exigen ellas: si alguien añade una ruta protegida en un sitio que la
 * tabla no cubre, falla aquí y no en producción.
 */

const ROOT = path.resolve(GATEWAY_ROOT, "..");
const API = path.join(ROOT, "moto-routes-api", "src");
const AUTH = path.join(ROOT, "moto-routes-auth", "src");

// Los middlewares que exigen sesión. optionalAuth no: con él la ruta es pública
const REQUIRES_AUTH = /\b(authenticate|adminOnly|hostOrAdmin|requireAuth)\b/;
const ROUTE = /router\.(get|post|put|patch|delete)\(\s*"([^"]*)"\s*,([\s\S]*?)\);/g;
const FILE_LEVEL = /router\.use\(\s*(authenticate|adminOnly|hostOrAdmin)\s*\)/;

/** Las rutas de un archivo de rutas de Express: { method, path, protected }. */
function readRoutes(file, prefix) {
  const source = readFileSync(file, "utf8");
  const fileLevel = FILE_LEVEL.exec(source);
  return [...source.matchAll(ROUTE)].map((match) => ({
    method: match[1].toUpperCase(),
    // Una ruta de ejemplo: los parámetros (:id, :slug) cambiados por un valor
    path: `${prefix}${match[2] === "/" ? "" : match[2]}`.replace(/:\w+/g, "x1"),
    protected: REQUIRES_AUTH.test(match[3]) || (fileLevel !== null && fileLevel.index < match.index),
  }));
}

/** Las de la API: cada archivo de routes/ con el prefijo con el que lo monta server.js. */
function apiRoutes() {
  const server = readFileSync(path.join(API, "server.js"), "utf8");
  const files = Object.fromEntries(
    [...server.matchAll(/import (\w+) from "\.\/routes\/([\w.]+)"/g)].map(([, name, file]) => [name, file]),
  );
  return [...server.matchAll(/app\.use\("(\/api\/[\w-]+)",\s*(\w+)\)/g)].flatMap(([, prefix, name]) =>
    readRoutes(path.join(API, "routes", files[name]), prefix),
  );
}

describe("la tabla de políticas y las rutas de verdad", { skip: !existsSync(API) && "no está moto-routes-api al lado" }, () => {
  it("lee las rutas de la API (si sale 0, el test se ha quedado viejo)", () => {
    const routes = apiRoutes();
    assert.ok(routes.length > 80, `solo ${routes.length} rutas`);
    assert.ok(routes.some((route) => route.protected) && routes.some((route) => !route.protected));
  });

  it("la API: exige sesión en la gateway justo donde la exige la API", () => {
    const wrong = apiRoutes()
      .filter((route) => requiresSession(route.method, route.path) !== route.protected)
      .map((route) => `${route.method} ${route.path} (API: ${route.protected ? "con sesión" : "pública"})`);
    assert.deepEqual(wrong, []);
  });

  it("auth: igual", { skip: !existsSync(AUTH) && "no está moto-routes-auth al lado" }, () => {
    const routes = readRoutes(path.join(AUTH, "routes", "auth.routes.js"), "/auth");
    assert.ok(routes.length >= 6, `solo ${routes.length} rutas`);
    const wrong = routes
      .filter((route) => requiresSession(route.method, route.path) !== route.protected)
      .map((route) => `${route.method} ${route.path} (auth: ${route.protected ? "con sesión" : "pública"})`);
    assert.deepEqual(wrong, []);
  });
});

describe("requiresSession", () => {
  it("lo público de la tienda, del catálogo, de auth y de la IA no la pide", () => {
    for (const [method, path] of [
      ["GET", "/api/shop/experiences/costa"],
      ["GET", "/api/routes"],
      ["GET", "/api/routes/slug/costa?x=1"],
      ["GET", "/api/docs"],
      ["POST", "/auth/login"],
      ["POST", "/auth/refresh"],
      ["GET", "/auth/.well-known/jwks.json"],
      ["POST", "/ai/chat"],
      ["GET", "/api/shop/experiences/costa/reviews"],
      ["GET", "/api/shop/hosts/lucia/reviews?sort=best"],
      ["GET", "/api/uploads/reviews/0b7c1f9e-3c2a-4a59-9d55-1f1c8f2b6a10.webp"],
      ["GET", "/health"],
    ]) {
      assert.equal(requiresSession(method, path), false, `${method} ${path}`);
    }
  });

  it("las opiniones: todas, la mía, sus fotos y la IA del panel, sí", () => {
    for (const [method, path] of [
      ["GET", "/api/reviews"],
      ["GET", "/api/reviews/6710a1b2c3d4e5f6a7b8c9a0"],
      ["GET", "/api/shop/experiences/costa/reviews/mine"],
      ["GET", "/api/shop/hosts/lucia/reviews/mine"],
      ["GET", "/ai/admin/reviews-health"],
      ["POST", "/api/reviews/6710a1b2c3d4e5f6a7b8c9a0/photos"],
      ["DELETE", "/api/reviews/6710a1b2c3d4e5f6a7b8c9a0/photos/6710a1b2c3d4e5f6a7b8c9a1"],
    ]) {
      assert.equal(requiresSession(method, path), true, `${method} ${path}`);
    }
  });

  it("ni un OPTIONS de CORS", () => {
    assert.equal(requiresSession("OPTIONS", "/api/users"), false);
  });
});
