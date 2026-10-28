import { Router } from "express";
import { imageController } from "../controllers/image.controller.js";
import { authenticate, optionalAuth } from "../middlewares/authenticate.js";
import { adminOnly } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, restoreSchema, setActiveSchema } from "../schemas/common.schema.js";
import { createImageSchema, imageQuerySchema, updateImageSchema } from "../schemas/image.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
// Escribir pide sesión; quién puede tocar cada imagen lo decide el service (ABAC)
const router = Router();

router.get("/", optionalAuth, validate({ query: imageQuerySchema }), imageController.list);
// Deben ir antes de "/:id" para que "actives", "inactives" y "deleted" no se tomen como un id
router.get("/actives", optionalAuth, imageController.listActives);
router.get("/inactives", adminOnly, imageController.listInactives);
router.get("/deleted", adminOnly, imageController.listDeleted);
router.get("/:id", optionalAuth, validate({ params: idParamSchema }), imageController.getById);
router.post("/", authenticate, validate({ body: createImageSchema }), imageController.create);
router.patch(
  "/:id",
  authenticate,
  validate({ params: idParamSchema, body: updateImageSchema }),
  imageController.update
);
router.patch(
  "/:id/active",
  authenticate,
  validate({ params: idParamSchema, body: setActiveSchema }),
  imageController.setActive
);
// Soft delete: no se borra el documento, se marca como eliminado
router.patch("/:id/delete", authenticate, validate({ params: idParamSchema }), imageController.remove);
router.patch(
  "/:id/restore",
  authenticate,
  validate({ params: idParamSchema, body: restoreSchema }),
  imageController.restore
);

export default router;
