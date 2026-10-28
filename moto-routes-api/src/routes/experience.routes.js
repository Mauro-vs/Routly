import { Router } from "express";
import { experienceController } from "../controllers/experience.controller.js";
import { adminOnly, hostOrAdmin } from "../middlewares/authorize.js";
import { optionalAuth } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, restoreSchema, setActiveSchema, slugParamSchema } from "../schemas/common.schema.js";
import { createExperienceSchema, updateExperienceSchema } from "../schemas/experience.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

router.get("/", optionalAuth, experienceController.list);
// Deben ir antes de "/:id" para que "actives", "inactives" y "deleted" no se tomen como un id
router.get("/actives", optionalAuth, experienceController.listActives);
router.get("/inactives", adminOnly, experienceController.listInactives);
router.get("/deleted", adminOnly, experienceController.listDeleted);
router.get("/slug/:slug", optionalAuth, validate({ params: slugParamSchema }), experienceController.getBySlug);
router.get("/:id", optionalAuth, validate({ params: idParamSchema }), experienceController.getById);
router.post("/", hostOrAdmin, validate({ body: createExperienceSchema }), experienceController.create);
router.patch(
  "/:id",
  hostOrAdmin,
  validate({ params: idParamSchema, body: updateExperienceSchema }),
  experienceController.update
);
router.patch(
  "/:id/active",
  hostOrAdmin,
  validate({ params: idParamSchema, body: setActiveSchema }),
  experienceController.setActive
);
// Soft delete: no se borra el documento, se marca como eliminado
router.patch("/:id/delete", hostOrAdmin, validate({ params: idParamSchema }), experienceController.remove);
router.patch(
  "/:id/restore",
  hostOrAdmin,
  validate({ params: idParamSchema, body: restoreSchema }),
  experienceController.restore
);

export default router;
