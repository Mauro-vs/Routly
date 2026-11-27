import { Router } from "express";
import { createLimiter } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.js";
import { slugParamSchema } from "../schemas/common.schema.js";

/**
 * El resumen IA de las opiniones: /ai/experiences/:slug/reviews-summary (detalle de la experiencia)
 * y /ai/hosts/:slug/reviews-summary (ficha del guía). Públicos, como la tienda.
 *
 * Va en su propio router (el agente de resumen de opiniones), montado en /ai con las rutas enteras.
 * El límite va en cada ruta y no con router.use: así no cuenta las peticiones de los demás routers
 * que pasan por aquí. Lo que hace: controllers/reviews.controller.js
 */
export function reviewsRouter(controller) {
  const router = Router();
  // Como los textos del detalle: unas pocas por visita y casi siempre de la caché
  const limiter = createLimiter({ limit: 60, windowMs: 15 * 60 * 1000 });
  const bySlug = validate({ params: slugParamSchema });

  router.get("/experiences/:slug/reviews-summary", limiter, bySlug, controller.summary("experience"));
  router.get("/hosts/:slug/reviews-summary", limiter, bySlug, controller.summary("host"));

  return router;
}
