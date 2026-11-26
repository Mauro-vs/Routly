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
 * que pasan por aquí.
 */
export function reviewsRouter({ reviewsSummary }) {
  const router = Router();
  // Como los textos del detalle: unas pocas por visita y casi siempre de la caché
  const limiter = createLimiter({ limit: 60, windowMs: 15 * 60 * 1000 });
  const bySlug = validate({ params: slugParamSchema });

  router.get("/experiences/:slug/reviews-summary", limiter, bySlug, async (req, res) => {
    res.json({ data: await reviewsSummary.forTarget("experience", req.params.slug) });
  });

  router.get("/hosts/:slug/reviews-summary", limiter, bySlug, async (req, res) => {
    res.json({ data: await reviewsSummary.forTarget("host", req.params.slug) });
  });

  return router;
}
