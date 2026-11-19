import { Router } from "express";
import { createLimiter } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.js";
import { slugParamSchema } from "../schemas/common.schema.js";

/**
 * Lo que el bloque Routly IA pide para el detalle de una experiencia: /ai/experiences/:slug/...
 * Público (sin sesión), como la tienda. Cada pieza va en su endpoint: la web las pide a la vez y,
 * si una falla, las demás se ven igual.
 */
export function experiencesRouter({ weather, stops, routeMap, insights }) {
  const router = Router();
  // Lo que se pide al abrir un detalle: unas pocas por visita. Con la caché casi nunca llega fuera
  router.use(createLimiter({ limit: 60, windowMs: 15 * 60 * 1000 }));

  const bySlug = validate({ params: slugParamSchema });

  // Los textos IA: resumen, para quién es, qué llevar y preguntas frecuentes
  router.get("/:slug/insights", bySlug, async (req, res) => {
    res.json({ data: await insights.forExperience(req.params.slug) });
  });

  router.get("/:slug/weather", bySlug, async (req, res) => {
    res.json({ data: await weather.forExperience(req.params.slug) });
  });

  router.get("/:slug/stops", bySlug, async (req, res) => {
    res.json({ data: await stops.forExperience(req.params.slug) });
  });

  // El mapa: el recorrido por carretera y los restaurantes que hay a lo largo
  router.get("/:slug/route", bySlug, async (req, res) => {
    res.json({ data: await routeMap.forExperience(req.params.slug) });
  });

  return router;
}
