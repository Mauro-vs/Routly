import express from "express";
import mongoose from "mongoose";
import { errorHandler, notFoundHandler } from "../middlewares/errorHandler.js";
import authRoutes from "../routes/auth.routes.js";
import bikeRoutes from "../routes/bike.routes.js";
import categoryRoutes from "../routes/category.routes.js";
import departureRoutes from "../routes/departure.routes.js";
import experienceRoutes from "../routes/experience.routes.js";
import hostRoutes from "../routes/host.routes.js";
import imageRoutes from "../routes/image.routes.js";
import locationRoutes from "../routes/location.routes.js";
import profileRoutes from "../routes/profile.routes.js";
import roleRoutes from "../routes/role.routes.js";
import routeRoutes from "../routes/route.routes.js";
import userRoutes from "../routes/user.routes.js";
import { User } from "../models/user.model.js";
import { roleService } from "../services/role.service.js";
import { userService } from "../services/user.service.js";
import { createToken } from "../utils/jwt.js";

// Los tests firman con su propio secreto si no hay uno definido, y sin límite de intentos
process.env.JWT_SECRET ??= "secreto-de-los-tests-con-mas-de-32-caracteres";
process.env.NODE_ENV ??= "test";

export const ADMIN_EMAIL = "admin@test.dev";
export const TEST_PASSWORD = "clave1234";

/**
 * Entorno de los tests de integración: la API real (routers, services, modelos y
 * errorHandler) sobre una base de datos temporal del MongoDB local, que se borra al
 * terminar. No usa server.js, que conecta con MONGODB_URI y se queda escuchando.
 *
 * El servidor se toma de MONGODB_TEST_URI (por defecto mongodb://localhost:27017):
 * hace falta tener MongoDB en marcha.
 *
 * Crea un admin (ADMIN_EMAIL) y las peticiones de api van con su token. Para probar con
 * otro usuario, api.loginAs(email); sin sesión, api.anonymous.
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

  // Los mismos routers y el mismo límite de body que server.js
  const app = express();
  app.use(express.json({ limit: "50kb" }));
  const routers = {
    auth: authRoutes,
    profile: profileRoutes,
    roles: roleRoutes,
    users: userRoutes,
    hosts: hostRoutes,
    categories: categoryRoutes,
    locations: locationRoutes,
    routes: routeRoutes,
    experiences: experienceRoutes,
    departures: departureRoutes,
    images: imageRoutes,
    bikes: bikeRoutes,
  };
  for (const [path, router] of Object.entries(routers)) app.use(`/api/${path}`, router);
  app.use(notFoundHandler);
  app.use(errorHandler);

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
    return {
      token,
      get: (path) => request("GET", path),
      post: (path, body) => request("POST", path, body),
      patch: (path, body) => request("PATCH", path, body),
    };
  };

  // Un token como el del login, firmado con los datos que hay ahora en la base de datos
  async function loginAs(email) {
    const user = await User.findOne({ email }).select("+tokenVersion").populate("role", "name").lean();
    if (!user) throw new Error(`No user with email ${email}`);
    return client(createToken({ ...user, role: user.role.name }));
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
