import { Router } from "express";
import { departureController } from "../controllers/departure.controller.js";
import { adminOnly, hostOrAdmin } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, restoreSchema, setActiveSchema, slugParamSchema } from "../schemas/common.schema.js";
import { createDepartureSchema, skuParamSchema, updateDepartureSchema } from "../schemas/departure.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

router.get("/", departureController.list);
// Deben ir antes de "/:id" para que "actives", "inactives" y "deleted" no se tomen como un id
router.get("/actives", departureController.listActives);
router.get("/inactives", adminOnly, departureController.listInactives);
router.get("/deleted", adminOnly, departureController.listDeleted);
router.get("/slug/:slug", validate({ params: slugParamSchema }), departureController.getBySlug);
router.get("/sku/:sku", validate({ params: skuParamSchema }), departureController.getBySku);
router.get("/:id", validate({ params: idParamSchema }), departureController.getById);
router.post("/", hostOrAdmin, validate({ body: createDepartureSchema }), departureController.create);
router.patch(
  "/:id",
  hostOrAdmin,
  validate({ params: idParamSchema, body: updateDepartureSchema }),
  departureController.update
);
router.patch(
  "/:id/active",
  hostOrAdmin,
  validate({ params: idParamSchema, body: setActiveSchema }),
  departureController.setActive
);
// Soft delete: no se borra el documento, se marca como eliminado
router.patch("/:id/delete", hostOrAdmin, validate({ params: idParamSchema }), departureController.remove);
router.patch(
  "/:id/restore",
  hostOrAdmin,
  validate({ params: idParamSchema, body: restoreSchema }),
  departureController.restore
);

export default router;
