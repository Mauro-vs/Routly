import { Router } from "express";
import { shopController } from "../controllers/shop.controller.js";
import { validate } from "../middlewares/validate.js";
import { slugParamSchema } from "../schemas/common.schema.js";
import { shopCarouselQuery, shopExperiencesQuery } from "../schemas/shop.schema.js";

// La tienda pública: sin sesión, y con sesión se ve lo mismo (services/shop.service.js).
// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

// Los carruseles del Home
router.get("/categories", validate({ query: shopCarouselQuery }), shopController.categories);
router.get("/hosts", validate({ query: shopCarouselQuery }), shopController.hosts);
router.get("/locations", validate({ query: shopCarouselQuery }), shopController.locations);

// El Shop y el detalle
router.get("/experiences", validate({ query: shopExperiencesQuery }), shopController.experiences);
router.get("/experiences/:slug", validate({ params: slugParamSchema }), shopController.experience);
router.get("/experiences/:slug/departures", validate({ params: slugParamSchema }), shopController.departures);

export default router;
