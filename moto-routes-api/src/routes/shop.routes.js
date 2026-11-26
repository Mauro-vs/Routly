import { Router } from "express";
import { shopController } from "../controllers/shop.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { shopReviewsQuery } from "../schemas/review.schema.js";
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

// La ficha de un anfitrión (guía): sus dos notas y sus experiencias
router.get("/hosts/:slug", validate({ params: slugParamSchema }), shopController.host);

// Las opiniones de una experiencia y de un anfitrión: leerlas es público; las mías, con sesión
// (authenticate va escrito en cada ruta: el test de políticas de la gateway lo busca ahí)
const reviewsQuery = validate({ params: slugParamSchema, query: shopReviewsQuery });
const bySlug = validate({ params: slugParamSchema });
router.get("/experiences/:slug/reviews", reviewsQuery, shopController.reviews("experience"));
router.get("/experiences/:slug/reviews/mine", authenticate, bySlug, shopController.myReview("experience"));
router.get("/hosts/:slug/reviews", reviewsQuery, shopController.reviews("host"));
router.get("/hosts/:slug/reviews/mine", authenticate, bySlug, shopController.myReview("host"));

export default router;
