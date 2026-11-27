import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { changePasswordSchema, loginSchema, registerSchema } from "../schemas/auth.schema.js";

/**
 * Las rutas de la sesión: URL, límites, sesión (authenticate) y validación. Lo que hace cada una
 * está en controllers/auth.controller.js. La documentación Swagger está en src/docs/openapi.js.
 * authenticate va escrito en cada ruta: el test de políticas de la gateway lo busca ahí.
 */
export function authRouter({ controller, authenticate, limiters }) {
  const router = Router();

  router.post("/register", limiters.register, validate({ body: registerSchema }), controller.register);
  router.post("/login", limiters.loginByIp, validate({ body: loginSchema }), limiters.loginByEmail, controller.login);
  router.post("/refresh", limiters.refresh, controller.refresh);
  router.post("/logout", controller.logout);
  router.post("/logout-all", authenticate, controller.logoutAll);
  router.get("/me", authenticate, controller.me);
  router.patch("/password", authenticate, validate({ body: changePasswordSchema }), controller.changePassword);

  return router;
}
