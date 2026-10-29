import { Router } from "express";
import { z } from "zod";
import { bikeController } from "../controllers/bike.controller.js";
import { profileController } from "../controllers/profile.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorizeOwnership } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { userRepository } from "../repositories/user.repository.js";
import { objectIdSchema } from "../schemas/common.schema.js";
import { changePasswordSchema, updateOwnUserSchema } from "../schemas/user.schema.js";
import { canAccessUserResource } from "../utils/access.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
// No hay endpoints para crear ni eliminar un perfil: nace y se elimina con su usuario.
const router = Router();

const userIdParamSchema = z.object({ userId: objectIdSchema });

// ABAC: el propio usuario o el admin
const ownerOrAdmin = authorizeOwnership(
  (req) => userRepository.findPlainById(req.params.userId),
  canAccessUserResource,
  "User"
);

router.use(authenticate);

// "/me" antes que "/:userId"
router.get("/me", profileController.getMe);
router.patch("/me", validate({ body: updateOwnUserSchema }), profileController.updateMe);
router.patch("/me/password", validate({ body: changePasswordSchema }), profileController.changePassword);
// Mi garaje: todas mis motos, también las privadas y las inactivas
router.get("/me/bikes", bikeController.listMine);
router.get("/:userId", validate({ params: userIdParamSchema }), ownerOrAdmin, profileController.getByUserId);
router.patch(
  "/:userId",
  validate({ params: userIdParamSchema, body: updateOwnUserSchema }),
  ownerOrAdmin,
  profileController.updateByUserId
);

export default router;
