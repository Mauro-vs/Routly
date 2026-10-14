import { Router } from "express";
import { routeController } from "../controllers/route.controller.js";
import { validate } from "../middlewares/validate.js";
import {
  createRouteSchema,
  idParamSchema,
  restoreRouteSchema,
  setActiveSchema,
  slugParamSchema,
  updateRouteSchema,
} from "../schemas/route.schema.js";

// La documentación Swagger de estos endpoints está en src/docs/route.docs.yaml
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
  validate({ params: idParamSchema, body: restoreRouteSchema }),
  routeController.restore
);

export default router;
