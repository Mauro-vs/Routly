import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { adminOnly } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, restoreSchema, setActiveSchema, slugParamSchema } from "../schemas/common.schema.js";
import { createUserSchema, updateUserSchema } from "../schemas/user.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

// Todo /api/users, también las lecturas, es solo del admin
router.use(adminOnly);

router.get("/", userController.list);
// Deben ir antes de "/:id" para que "actives", "inactives" y "deleted" no se tomen como un id
router.get("/actives", userController.listActives);
router.get("/inactives", userController.listInactives);
router.get("/deleted", userController.listDeleted);
router.get("/slug/:slug", validate({ params: slugParamSchema }), userController.getBySlug);
router.get("/:id", validate({ params: idParamSchema }), userController.getById);
router.post("/", validate({ body: createUserSchema }), userController.create);
router.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateUserSchema }),
  userController.update
);
router.patch(
  "/:id/active",
  validate({ params: idParamSchema, body: setActiveSchema }),
  userController.setActive
);
// Soft delete: no se borra el documento, se marca como eliminado
router.patch("/:id/delete", validate({ params: idParamSchema }), userController.remove);
router.patch(
  "/:id/restore",
  validate({ params: idParamSchema, body: restoreSchema }),
  userController.restore
);

export default router;
