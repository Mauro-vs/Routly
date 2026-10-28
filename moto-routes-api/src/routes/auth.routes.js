import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authLimiter } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";

// La documentación Swagger de estos endpoints se genera en src/docs/
const router = Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), authController.register);
router.post("/login", authLimiter, validate({ body: loginSchema }), authController.login);
router.get("/me", authenticate, authController.me);
// Cerrar la sesión en este dispositivo es cosa del cliente (borra el token); esto cierra
// todas, en todos los dispositivos
router.post("/logout-all", authenticate, authController.logoutAll);

export default router;
