import { Router } from "express";
import { locationController } from "../controllers/location.controller.js";
import { adminOnly } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, restoreSchema, setActiveSchema, slugParamSchema } from "../schemas/common.schema.js";
import { createLocationSchema, updateLocationSchema } from "../schemas/location.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

router.get("/", locationController.list);
// Deben ir antes de "/:id" para que "actives", "inactives" y "deleted" no se tomen como un id
router.get("/actives", locationController.listActives);
router.get("/inactives", adminOnly, locationController.listInactives);
router.get("/deleted", adminOnly, locationController.listDeleted);
router.get("/slug/:slug", validate({ params: slugParamSchema }), locationController.getBySlug);
router.get("/:id", validate({ params: idParamSchema }), locationController.getById);
router.post("/", adminOnly, validate({ body: createLocationSchema }), locationController.create);
router.patch(
  "/:id",
  adminOnly,
  validate({ params: idParamSchema, body: updateLocationSchema }),
  locationController.update
);
router.patch(
  "/:id/active",
  adminOnly,
  validate({ params: idParamSchema, body: setActiveSchema }),
  locationController.setActive
);
// Soft delete: no se borra el documento, se marca como eliminado
router.patch("/:id/delete", adminOnly, validate({ params: idParamSchema }), locationController.remove);
router.patch(
  "/:id/restore",
  adminOnly,
  validate({ params: idParamSchema, body: restoreSchema }),
  locationController.restore
);

export default router;
