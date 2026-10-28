import { Router } from "express";
import { categoryController } from "../controllers/category.controller.js";
import { adminOnly } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, restoreSchema, setActiveSchema, slugParamSchema } from "../schemas/common.schema.js";
import { createCategorySchema, updateCategorySchema } from "../schemas/category.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

router.get("/", categoryController.list);
// Deben ir antes de "/:id" para que "actives", "inactives" y "deleted" no se tomen como un id
router.get("/actives", categoryController.listActives);
router.get("/inactives", adminOnly, categoryController.listInactives);
router.get("/deleted", adminOnly, categoryController.listDeleted);
router.get("/slug/:slug", validate({ params: slugParamSchema }), categoryController.getBySlug);
router.get("/:id", validate({ params: idParamSchema }), categoryController.getById);
router.post("/", adminOnly, validate({ body: createCategorySchema }), categoryController.create);
router.patch(
  "/:id",
  adminOnly,
  validate({ params: idParamSchema, body: updateCategorySchema }),
  categoryController.update
);
router.patch(
  "/:id/active",
  adminOnly,
  validate({ params: idParamSchema, body: setActiveSchema }),
  categoryController.setActive
);
// Soft delete: no se borra el documento, se marca como eliminado
router.patch("/:id/delete", adminOnly, validate({ params: idParamSchema }), categoryController.remove);
router.patch(
  "/:id/restore",
  adminOnly,
  validate({ params: idParamSchema, body: restoreSchema }),
  categoryController.restore
);

export default router;
