import { Router } from "express";
import { hostController } from "../controllers/host.controller.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, restoreSchema, setActiveSchema, slugParamSchema } from "../schemas/common.schema.js";
import { createHostSchema, updateHostSchema } from "../schemas/host.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

router.get("/", hostController.list);
// Deben ir antes de "/:id" para que "actives", "inactives" y "deleted" no se tomen como un id
router.get("/actives", hostController.listActives);
router.get("/inactives", hostController.listInactives);
router.get("/deleted", hostController.listDeleted);
router.get("/slug/:slug", validate({ params: slugParamSchema }), hostController.getBySlug);
router.get("/:id", validate({ params: idParamSchema }), hostController.getById);
router.post("/", validate({ body: createHostSchema }), hostController.create);
router.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateHostSchema }),
  hostController.update
);
router.patch(
  "/:id/active",
  validate({ params: idParamSchema, body: setActiveSchema }),
  hostController.setActive
);
// Soft delete: no se borra el documento, se marca como eliminado
router.patch("/:id/delete", validate({ params: idParamSchema }), hostController.remove);
router.patch(
  "/:id/restore",
  validate({ params: idParamSchema, body: restoreSchema }),
  hostController.restore
);

export default router;
