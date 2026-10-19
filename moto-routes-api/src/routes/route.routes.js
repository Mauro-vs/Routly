import { Router } from "express";
import { routeController } from "../controllers/route.controller.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, restoreSchema, setActiveSchema, slugParamSchema } from "../schemas/common.schema.js";
import { createRouteSchema, updateRouteSchema } from "../schemas/route.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

router.get("/", routeController.list);
// Deben ir antes de "/:id" para que "actives", "inactives" y "deleted" no se tomen como un id
router.get("/actives", routeController.listActives);
router.get("/inactives", routeController.listInactives);
router.get("/deleted", routeController.listDeleted);
router.get("/slug/:slug", validate({ params: slugParamSchema }), routeController.getBySlug);
router.get("/:id", validate({ params: idParamSchema }), routeController.getById);
router.post("/", validate({ body: createRouteSchema }), routeController.create);
router.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateRouteSchema }),
  routeController.update
);
router.patch(
  "/:id/active",
  validate({ params: idParamSchema, body: setActiveSchema }),
  routeController.setActive
);
// Soft delete: no se borra el documento, se marca como eliminado
router.patch("/:id/delete", validate({ params: idParamSchema }), routeController.remove);
router.patch(
  "/:id/restore",
  validate({ params: idParamSchema, body: restoreSchema }),
  routeController.restore
);

export default router;
