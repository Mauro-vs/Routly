import { Router } from "express";
import { experienceController } from "../controllers/experience.controller.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, restoreSchema, setActiveSchema, slugParamSchema } from "../schemas/common.schema.js";
import { createExperienceSchema, updateExperienceSchema } from "../schemas/experience.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

router.get("/", experienceController.list);
// Deben ir antes de "/:id" para que "actives", "inactives" y "deleted" no se tomen como un id
router.get("/actives", experienceController.listActives);
router.get("/inactives", experienceController.listInactives);
router.get("/deleted", experienceController.listDeleted);
router.get("/slug/:slug", validate({ params: slugParamSchema }), experienceController.getBySlug);
router.get("/:id", validate({ params: idParamSchema }), experienceController.getById);
router.post("/", validate({ body: createExperienceSchema }), experienceController.create);
router.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateExperienceSchema }),
  experienceController.update
);
router.patch(
  "/:id/active",
  validate({ params: idParamSchema, body: setActiveSchema }),
  experienceController.setActive
);
// Soft delete: no se borra el documento, se marca como eliminado
router.patch("/:id/delete", validate({ params: idParamSchema }), experienceController.remove);
router.patch(
  "/:id/restore",
  validate({ params: idParamSchema, body: restoreSchema }),
  experienceController.restore
);

export default router;
