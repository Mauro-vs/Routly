import { Router } from "express";
import { categoryController } from "../controllers/category.controller.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, restoreSchema, setActiveSchema, slugParamSchema } from "../schemas/common.schema.js";
import { createCategorySchema, updateCategorySchema } from "../schemas/category.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

router.get("/", categoryController.list);
// Deben ir antes de "/:id" para que "actives", "inactives" y "deleted" no se tomen como un id
router.get("/actives", categoryController.listActives);
router.get("/inactives", categoryController.listInactives);
router.get("/deleted", categoryController.listDeleted);
router.get("/slug/:slug", validate({ params: slugParamSchema }), categoryController.getBySlug);
router.get("/:id", validate({ params: idParamSchema }), categoryController.getById);
router.post("/", validate({ body: createCategorySchema }), categoryController.create);
router.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateCategorySchema }),
  categoryController.update
);
router.patch(
  "/:id/active",
  validate({ params: idParamSchema, body: setActiveSchema }),
  categoryController.setActive
);
// Soft delete: no se borra el documento, se marca como eliminado
router.patch("/:id/delete", validate({ params: idParamSchema }), categoryController.remove);
router.patch(
  "/:id/restore",
  validate({ params: idParamSchema, body: restoreSchema }),
  categoryController.restore
);

export default router;
