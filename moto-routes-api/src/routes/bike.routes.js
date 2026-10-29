import { Router } from "express";
import { bikeController } from "../controllers/bike.controller.js";
import { authenticate, optionalAuth } from "../middlewares/authenticate.js";
import { adminOnly } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { createBikeSchema, updateBikeSchema } from "../schemas/bike.schema.js";
import { idParamSchema, restoreSchema, setActiveSchema, slugParamSchema } from "../schemas/common.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
// Escribir pide sesión; si la moto es suya (o es admin) lo decide el service (ABAC).
// "Mi garaje" está en GET /api/profile/me/bikes.
const router = Router();

router.get("/", optionalAuth, bikeController.list);
// Deben ir antes de "/:id" para que "actives", "inactives" y "deleted" no se tomen como un id
router.get("/actives", optionalAuth, bikeController.listActives);
router.get("/inactives", adminOnly, bikeController.listInactives);
router.get("/deleted", adminOnly, bikeController.listDeleted);
router.get("/slug/:slug", optionalAuth, validate({ params: slugParamSchema }), bikeController.getBySlug);
router.get("/:id", optionalAuth, validate({ params: idParamSchema }), bikeController.getById);
router.post("/", authenticate, validate({ body: createBikeSchema }), bikeController.create);
router.patch(
  "/:id",
  authenticate,
  validate({ params: idParamSchema, body: updateBikeSchema }),
  bikeController.update
);
router.patch(
  "/:id/active",
  authenticate,
  validate({ params: idParamSchema, body: setActiveSchema }),
  bikeController.setActive
);
// Soft delete: no se borra el documento, se marca como eliminado
router.patch("/:id/delete", authenticate, validate({ params: idParamSchema }), bikeController.remove);
router.patch(
  "/:id/restore",
  authenticate,
  validate({ params: idParamSchema, body: restoreSchema }),
  bikeController.restore
);

export default router;
