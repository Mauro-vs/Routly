import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { User } from "../models/user.model.js";
import { roleService } from "../services/role.service.js";
import { userService } from "../services/user.service.js";
import { signTestToken, useTestKeys } from "./tokens.js";

process.env.NODE_ENV ??= "test";
// Los tokens los firma una clave de prueba (testing/tokens.js) y la API los comprueba con su JWKS,
// sin el servicio de auth
useTestKeys();
// Las fotos que se suban, siempre en una carpeta temporal por proceso que se borra al terminar,
// nunca en la de verdad (config/uploads.js la lee la primera vez que se usa, ya con este valor)
const TEST_UPLOADS_DIR = mkdtempSync(path.join(tmpdir(), "routly-uploads-"));
process.env.UPLOADS_DIR = TEST_UPLOADS_DIR;

export const ADMIN_EMAIL = "admin@test.dev";
export const TEST_PASSWORD = "clave1234";

/**
 * Entorno de los tests de integración: la API real (routers, services, modelos y
 * errorHandler) sobre una base de datos temporal del MongoDB local, que se borra al
 * terminar. Usa createApp() (src/app.js), la misma app que server.js, pero sin conectar
 * con MONGODB_URI.
 *
 * El servidor se toma de MONGODB_TEST_URI (por defecto mongodb://localhost:27017):
 * hace falta tener MongoDB en marcha.
 *
 * Crea un admin (ADMIN_EMAIL) y las peticiones de api van con su token. Para probar con
 * otro usuario, api.loginAs(email); sin sesión, api.anonymous. El login de verdad es del
 * servicio de auth: aquí los tokens se firman como él (testing/tokens.js).
 *
 * Uso, en un archivo *.test.js:
 *   const api = await startApi("slug");
 *   after(() => api.stop());
 *   const { status, body } = await api.post("/categories", { name: "Montaña" });
 *   const rider = await api.loginAs("marta@example.com");
 *   assert.equal((await rider.post("/categories", { name: "X" })).status, 403);
 */
export async function startApi(name) {
  const uri = process.env.MONGODB_TEST_URI ?? "mongodb://localhost:27017";
  // Una base de datos por archivo y por proceso: los archivos se ejecutan en paralelo
  const dbName = `routly_test_${name}_${process.pid}`;

  try {
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 3000 });
  } catch (error) {
    throw new Error(`Los tests necesitan MongoDB en ${uri} (${error.message})`);
  }
  // Si algo falla a partir de aquí hay que cerrar la conexión: si no, el proceso de test se queda
  // esperando para siempre en lugar de enseñar el error
  try {
    await mongoose.connection.dropDatabase();
    // Los índices únicos (slug, email, nombre...) tienen que existir antes de la primera prueba
    await Promise.all(mongoose.modelNames().map((model) => mongoose.model(model).syncIndexes()));
  } catch (error) {
    await mongoose.disconnect();
    throw error;
  }

  // La misma app que arranca server.js (src/app.js), escuchando en un puerto libre
  const app = createApp();
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const base = `http://localhost:${server.address().port}/api`;

  // Un cliente con el token que se le pase (o sin ninguno)
  const client = (token) => {
    const request = async (method, path, body) => {
      const headers = { "content-type": "application/json" };
      if (token) headers.authorization = `Bearer ${token}`;
      const response = await fetch(base + path, {
        method,
        headers,
        body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
      });
      return {
        status: response.status,
        headers: response.headers,
        body: response.status === 204 ? null : await response.json(),
      };
    };
    // multipart/form-data: { campo: Blob o texto }. Blob con nombre: [blob, "foto.jpg"]
    const upload = async (path, fields) => {
      const form = new FormData();
      for (const [name, value] of Object.entries(fields)) {
        if (Array.isArray(value)) form.append(name, ...value);
        else form.append(name, value);
      }
      const response = await fetch(base + path, {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: form,
      });
      return { status: response.status, headers: response.headers, body: await response.json() };
    };
    return {
      token,
      get: (path) => request("GET", path),
      post: (path, body) => request("POST", path, body),
      patch: (path, body) => request("PATCH", path, body),
      delete: (path) => request("DELETE", path),
      upload,
    };
  };

  // Un token como el del servicio de auth, firmado con los datos que hay ahora en la base de datos
  async function loginAs(email) {
    const user = await User.findOne({ email }).select("+tokenVersion").populate("role", "name").lean();
    if (!user) throw new Error(`No user with email ${email}`);
    return client(await signTestToken({ ...user, role: user.role.name }));
  }

  // El admin se crea con los services: sin admin no se puede crear nada por la API
  const adminRole = await roleService.create({ name: "admin", label: "Administrador", isSystem: true });
  await userService.create({
    name: "Admin Tests",
    email: ADMIN_EMAIL,
    password: TEST_PASSWORD,
    roleId: String(adminRole._id),
  });
  const admin = await loginAs(ADMIN_EMAIL);

  return {
    ...admin,
    base,
    adminRole,
    anonymous: client(null),
    as: client,
    loginAs,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
      rmSync(TEST_UPLOADS_DIR, { recursive: true, force: true });
    },
  };
}

/** El primer mensaje de error de un campo: "distance must be greater than 0". */
export const fieldMessage = (response, field) =>
  response.body?.details?.find((detail) => detail.field === field)?.message;

/**
 * Mismo contenido sin importar el orden de las claves: los populate en paralelo
 * pueden devolver las relaciones en distinto orden de una petición a otra.
 */
export function sameContent(a, b) {
  const sorted = (value) =>
    Array.isArray(value)
      ? value.map(sorted)
      : value && typeof value === "object"
        ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]))
        : value;
  return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
}

// Un día en milisegundos y una fecha ISO a partir de ahora
export const DAY = 24 * 60 * 60 * 1000;
export const fromNow = (ms) => new Date(Date.now() + ms).toISOString();

/**
 * Crea los datos mínimos para probar cualquier colección: roles, usuario anfitrión,
 * categoría, ubicación, ruta, experiencia y una salida. Devuelve los documentos.
 */
export async function seedBasics(api) {
  const rider = (await api.post("/roles", { name: "rider", label: "Rider" })).body;
  const hostRole = (await api.post("/roles", { name: "host", label: "Anfitrión" })).body;
  const category = (await api.post("/categories", { name: "Montaña" })).body;
  const location = (await api.post("/locations", { city: "Jaca", latitude: 42.57, longitude: -0.55 })).body;
  const route = (
    await api.post("/routes", {
      title: "Valle de Tena",
      difficulty: "medium",
      distance: 80,
      duration: 3,
      categoryId: category._id,
      startLocationId: location._id,
      endLocationId: location._id,
    })
  ).body;
  const user = (
    await api.post("/users", {
      name: "Ana Pérez",
      email: "ana@example.com",
      password: "clave1234",
      roleId: hostRole._id,
    })
  ).body;
  const host = (await api.post("/hosts", { userId: user._id, name: "Ana Rutas" })).body;
  const experience = (
    await api.post("/experiences", {
      hostId: host._id,
      routeId: route._id,
      title: "Pirineo en moto",
      duration: 8,
      minParticipants: 2,
      maxParticipants: 10,
    })
  ).body;
  const departure = (
    await api.post("/departures", {
      experienceId: experience._id,
      startAt: fromNow(7 * DAY),
      endAt: fromNow(7 * DAY + 8 * 60 * 60 * 1000),
      capacity: 6,
      price: 120,
    })
  ).body;
  return { rider, hostRole, category, location, route, user, host, experience, departure };
}

// Todas las etapas de un plan de MongoDB: IXSCAN usa un índice, COLLSCAN recorre la colección
function stagesOf(plan) {
  if (!plan || typeof plan !== "object") return [];
  const own = plan.stage ? [plan.stage] : [];
  return [...own, ...[plan.inputStage, ...(plan.inputStages ?? [])].flatMap(stagesOf)];
}

/**
 * Las etapas del plan que elige MongoDB para una consulta de Mongoose, para comprobar con
 * explain() que usa un índice: assert.ok(stages.includes("IXSCAN") && !stages.includes("COLLSCAN")).
 */
export async function planStages(query) {
  const explained = await query.explain("queryPlanner");
  return stagesOf((Array.isArray(explained) ? explained[0] : explained).queryPlanner.winningPlan);
}
