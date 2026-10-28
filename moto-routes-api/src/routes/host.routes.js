import { Router } from "express";
import { hostController } from "../controllers/host.controller.js";
import { adminOnly, hostOrAdmin } from "../middlewares/authorize.js";
import { optionalAuth } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, restoreSchema, setActiveSchema, slugParamSchema } from "../schemas/common.schema.js";
import { createHostSchema, updateHostSchema } from "../schemas/host.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

router.get("/", optionalAuth, hostController.list);
// Deben ir antes de "/:id" para que "actives", "inactives" y "deleted" no se tomen como un id
router.get("/actives", optionalAuth, hostController.listActives);
router.get("/inactives", adminOnly, hostController.listInactives);
router.get("/deleted", adminOnly, hostController.listDeleted);
router.get("/slug/:slug", optionalAuth, validate({ params: slugParamSchema }), hostController.getBySlug);
router.get("/:id", optionalAuth, validate({ params: idParamSchema }), hostController.getById);
router.post("/", adminOnly, validate({ body: createHostSchema }), hostController.create);
router.patch(
  "/:id",
  hostOrAdmin,
  validate({ params: idParamSchema, body: updateHostSchema }),
  hostController.update
);
router.patch(
  "/:id/active",
  adminOnly,
  validate({ params: idParamSchema, body: setActiveSchema }),
  hostController.setActive
);
// Soft delete: no se borra el documento, se marca como eliminado
router.patch("/:id/delete", adminOnly, validate({ params: idParamSchema }), hostController.remove);
router.patch(
  "/:id/restore",
  adminOnly,
  validate({ params: idParamSchema, body: restoreSchema }),
  hostController.restore
);

export default router;
