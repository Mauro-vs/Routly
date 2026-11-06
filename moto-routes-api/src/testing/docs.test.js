import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { swaggerSpec } from "../config/swagger.js";
import { startApi } from "./app.js";

// La documentación y las rutas no pueden contar cosas distintas: cada operación con
// candado (security) responde 401 sin token, y ninguna sin candado lo hace.
let api;
before(async () => {
  api = await startApi("docs");
});
after(() => api?.stop());

// Valores con formato válido para los parámetros de la ruta
const PARAMS = { id: "6710a1b2c3d4e5f6a7b8c999", userId: "6710a1b2c3d4e5f6a7b8c999", slug: "no-existe", sku: "RTL-DEP-261108-7QX2M" };
const toPath = (path) => path.replace(/^\/api/, "").replace(/\{(\w+)\}/g, (_, name) => PARAMS[name]);

test("cada operación de Swagger con candado pide token, y las demás no", async () => {
  const operations = Object.entries(swaggerSpec.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) => ({ method, path, operation }))
  );
  assert.ok(operations.length > 100);

  for (const { method, path, operation } of operations) {
    const { status } = await api.anonymous[method](toPath(path), method === "get" ? undefined : {});
    const label = `${method.toUpperCase()} ${path}`;

    if (operation.security) {
      assert.equal(status, 401, `${label} tiene candado y responde ${status}`);
      assert.ok(operation.responses[401], `${label} no documenta el 401`);
    } else {
      assert.notEqual(status, 401, `${label} no tiene candado y pide token`);
    }
  }
});

test("los 401, 403 y 429 documentados usan los mensajes exactos de la API", () => {
  const { responses } = swaggerSpec.components;
  const example = (name) => responses[name].content["application/json"].example.message;

  assert.equal(example("Unauthorized"), "Authentication required");
  assert.equal(example("Forbidden"), "You do not have permission to access this resource");
  assert.equal(example("TooManyRequests"), "Too many attempts, please try again later");
  assert.deepEqual(swaggerSpec.components.securitySchemes.bearerAuth, {
    ...swaggerSpec.components.securitySchemes.bearerAuth,
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });
  assert.equal(swaggerSpec.components.securitySchemes.cookieAuth.name, "routly_session");
  assert.equal(swaggerSpec.components.securitySchemes.cookieAuth.in, "cookie");
});

test("cada listado documenta justo los query params que acepta su esquema", async () => {
  const schemas = {
    roles: (await import("../schemas/role.schema.js")).roleListQuery,
    users: (await import("../schemas/user.schema.js")).userListQuery,
    hosts: (await import("../schemas/host.schema.js")).hostListQuery,
    categories: (await import("../schemas/category.schema.js")).categoryListQuery,
    locations: (await import("../schemas/location.schema.js")).locationListQuery,
    routes: (await import("../schemas/route.schema.js")).routeListQuery,
    experiences: (await import("../schemas/experience.schema.js")).experienceListQuery,
    departures: (await import("../schemas/departure.schema.js")).departureListQuery,
    images: (await import("../schemas/image.schema.js")).imageListQuery,
    bikes: (await import("../schemas/bike.schema.js")).bikeListQuery,
  };

  for (const [path, listQuery] of Object.entries(schemas)) {
    const documented = swaggerSpec.paths[`/api/${path}`].get.parameters.map((parameter) => parameter.name);
    assert.deepEqual(documented.sort(), Object.keys(listQuery.schema.shape).sort(), path);
  }
});
