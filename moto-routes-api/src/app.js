import express from "express";
import swaggerUi from "swagger-ui-express";
import { corsMiddleware } from "./config/cors.js";
import { helmetMiddleware } from "./config/helmet.js";
import { morganMiddleware } from "./config/morgan.js";
import { applyTrustProxy } from "./config/proxy.js";
import { swaggerSpec } from "./config/swagger.js";
import { serveUploads } from "./config/uploads.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import bikeRoutes from "./routes/bike.routes.js";
import shopRoutes from "./routes/shop.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import departureRoutes from "./routes/departure.routes.js";
import experienceRoutes from "./routes/experience.routes.js";
import hostRoutes from "./routes/host.routes.js";
import imageRoutes from "./routes/image.routes.js";
import locationRoutes from "./routes/location.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import roleRoutes from "./routes/role.routes.js";
import routeRoutes from "./routes/route.routes.js";
import userRoutes from "./routes/user.routes.js";
import { visibilityCache } from "./services/visibility.js";

/**
 * La app de Express entera: middlewares, routers y errorHandler. No conecta con MongoDB ni
 * escucha en un puerto: eso lo hace server.js. Los tests (testing/app.js) usan esta misma app,
 * así que lo que se prueba es exactamente lo que arranca.
 *
 * Cómo sigue una petición: routes/x.routes.js (URL, sesión y validación con Zod) →
 * controllers/x.controller.js (lee req y responde) → services/x.service.js (las reglas) →
 * repositories/x.repository.js (las consultas) → models/x.model.js (el esquema de Mongoose).
 */
export function createApp() {
  const app = express();

  // Detrás de un proxy (TRUST_PROXY): la IP, el protocolo y el host del cliente, no los suyos
  applyTrustProxy(app);

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  // En los tests no se registra cada petición: solo ensuciaría la salida y los logs
  if (process.env.NODE_ENV !== "test") app.use(morganMiddleware);
  // El body más grande es una experiencia con su descripción (unos 3 kB): 50 kB da margen
  // y corta peticiones desmedidas con un 413
  app.use(express.json({ limit: "50kb" }));
  // Lo oculto se calcula como mucho una vez por petición (services/visibility.js)
  app.use(visibilityCache);

  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  // Las fotos de las opiniones (público): /api/uploads/reviews/<archivo>
  serveUploads(app);

  // persistAuthorization: el token de Authorize no se pierde al recargar la página
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, { swaggerOptions: { persistAuthorization: true } })
  );
  app.use("/api/profile", profileRoutes);
  app.use("/api/roles", roleRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/hosts", hostRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/locations", locationRoutes);
  app.use("/api/routes", routeRoutes);
  app.use("/api/experiences", experienceRoutes);
  app.use("/api/departures", departureRoutes);
  app.use("/api/images", imageRoutes);
  app.use("/api/bikes", bikeRoutes);
  // Escribir opiniones y moderarlas (las públicas se leen en /api/shop)
  app.use("/api/reviews", reviewRoutes);
  // La tienda pública: el Home, el Shop, el detalle de una experiencia y sus opiniones
  app.use("/api/shop", shopRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
