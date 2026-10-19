import { Router } from "express";
import { roleController } from "../controllers/role.controller.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, restoreSchema, setActiveSchema, slugParamSchema } from "../schemas/common.schema.js";
import { createRoleSchema, updateRoleSchema } from "../schemas/role.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

router.get("/", roleController.list);
// Deben ir antes de "/:id" para que "actives", "inactives" y "deleted" no se tomen como un id
router.get("/actives", roleController.listActives);
router.get("/inactives", roleController.listInactives);
router.get("/deleted", roleController.listDeleted);
router.get("/slug/:slug", validate({ params: slugParamSchema }), roleController.getBySlug);
router.get("/:id", validate({ params: idParamSchema }), roleController.getById);
router.post("/", validate({ body: createRoleSchema }), roleController.create);
router.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateRoleSchema }),
  roleController.update
);
router.patch(
  "/:id/active",
  validate({ params: idParamSchema, body: setActiveSchema }),
  roleController.setActive
);
// Soft delete: no se borra el documento, se marca como eliminado
router.patch("/:id/delete", validate({ params: idParamSchema }), roleController.remove);
router.patch(
  "/:id/restore",
  validate({ params: idParamSchema, body: restoreSchema }),
  roleController.restore
);

export default router;
