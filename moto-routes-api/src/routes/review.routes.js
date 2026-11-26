import { Router } from "express";
import { reviewController } from "../controllers/review.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { adminOnly } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, restoreSchema, setActiveSchema } from "../schemas/common.schema.js";
import { createReviewSchema, reviewListQuery, updateReviewSchema } from "../schemas/review.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
// Las opiniones públicas se leen en la tienda (/api/shop/.../reviews). Aquí: escribir (con sesión;
// si es suya lo decide el service) y la moderación del panel (solo admin)
const router = Router();

router.get("/", adminOnly, validate({ query: reviewListQuery.schema }), reviewController.list);
// Deben ir antes de "/:id" para que "inactives" y "deleted" no se tomen como un id
router.get("/inactives", adminOnly, reviewController.listInactives);
router.get("/deleted", adminOnly, reviewController.listDeleted);
router.get("/:id", adminOnly, validate({ params: idParamSchema }), reviewController.getById);
router.post("/", authenticate, validate({ body: createReviewSchema }), reviewController.create);
// Solo su autor
router.patch(
  "/:id",
  authenticate,
  validate({ params: idParamSchema, body: updateReviewSchema }),
  reviewController.update
);
// Ocultar o volver a mostrar: la moderación
router.patch(
  "/:id/active",
  adminOnly,
  validate({ params: idParamSchema, body: setActiveSchema }),
  reviewController.setActive
);
// Soft delete: su autor o el admin
router.patch("/:id/delete", authenticate, validate({ params: idParamSchema }), reviewController.remove);
router.patch(
  "/:id/restore",
  adminOnly,
  validate({ params: idParamSchema, body: restoreSchema }),
  reviewController.restore
);

export default router;
