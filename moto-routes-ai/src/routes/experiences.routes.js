import { Router } from "express";
import { createLimiter } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.js";
import { slugParamSchema } from "../schemas/common.schema.js";

/**
 * Lo que el bloque Routly IA pide para el detalle de una experiencia: /ai/experiences/:slug/...
 * Público (sin sesión), como la tienda. Cada pieza va en su endpoint: la web las pide a la vez y,
 * si una falla, las demás se ven igual. Lo que hace cada una: controllers/experiences.controller.js
 */
export function experiencesRouter(controller) {
  const router = Router();
  // Lo que se pide al abrir un detalle: unas pocas por visita. Con la caché casi nunca llega fuera
  router.use(createLimiter({ limit: 60, windowMs: 15 * 60 * 1000 }));
  const bySlug = validate({ params: slugParamSchema });

  router.get("/:slug/insights", bySlug, controller.insights);
  router.get("/:slug/weather", bySlug, controller.weather);
  router.get("/:slug/stops", bySlug, controller.stops);
  router.get("/:slug/route", bySlug, controller.routeMap);

  return router;
}
