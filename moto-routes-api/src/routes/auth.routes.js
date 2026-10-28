import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { loginLimiter, registerLimiter } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

router.post("/register", registerLimiter, validate({ body: registerSchema }), authController.register);
router.post("/login", loginLimiter, validate({ body: loginSchema }), authController.login);
router.get("/me", authenticate, authController.me);
// Cierra esta sesión: el token va a la lista negra (el cliente, además, lo borra)
router.post("/logout", authenticate, authController.logout);
// Cierra todas las sesiones del usuario, en todos los dispositivos (tokenVersion)
router.post("/logout-all", authenticate, authController.logoutAll);

export default router;
