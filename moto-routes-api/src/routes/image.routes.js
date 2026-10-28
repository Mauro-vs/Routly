import { Router } from "express";
import { imageController } from "../controllers/image.controller.js";
import { adminOnly, hostOrAdmin } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, restoreSchema, setActiveSchema } from "../schemas/common.schema.js";
import { createImageSchema, imageQuerySchema, updateImageSchema } from "../schemas/image.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

router.get("/", validate({ query: imageQuerySchema }), imageController.list);
// Deben ir antes de "/:id" para que "actives", "inactives" y "deleted" no se tomen como un id
router.get("/actives", imageController.listActives);
router.get("/inactives", adminOnly, imageController.listInactives);
router.get("/deleted", adminOnly, imageController.listDeleted);
router.get("/:id", validate({ params: idParamSchema }), imageController.getById);
router.post("/", hostOrAdmin, validate({ body: createImageSchema }), imageController.create);
router.patch(
  "/:id",
  hostOrAdmin,
  validate({ params: idParamSchema, body: updateImageSchema }),
  imageController.update
);
router.patch(
  "/:id/active",
  hostOrAdmin,
  validate({ params: idParamSchema, body: setActiveSchema }),
  imageController.setActive
);
// Soft delete: no se borra el documento, se marca como eliminado
router.patch("/:id/delete", hostOrAdmin, validate({ params: idParamSchema }), imageController.remove);
router.patch(
  "/:id/restore",
  hostOrAdmin,
  validate({ params: idParamSchema, body: restoreSchema }),
  imageController.restore
);

export default router;
