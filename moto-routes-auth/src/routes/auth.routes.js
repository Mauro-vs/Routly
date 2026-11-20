import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { changePasswordSchema, loginSchema, registerSchema } from "../schemas/auth.schema.js";
import { clearSessionCookies, cookieNames, readCookie, setSessionCookies } from "../utils/cookies.js";
import { readAccessToken } from "../middlewares/authenticate.js";

/**
 * Los endpoints de la sesión. La documentación Swagger está en src/docs/openapi.js.
 *
 * Una sesión responde { tokenType, expiresIn, user } y deja las dos cookies. El token de acceso
 * solo va también en el body si TOKEN_IN_BODY (por defecto, fuera de producción): para Swagger,
 * Postman y los tests. El refresh nunca sale del body: solo en su cookie.
 */
export function authRouter({ auth, tokens, authenticate, limiters, config }) {
  const router = Router();
  const { cookies } = config;

  const sendSession = (res, session, status = 200) => {
    setSessionCookies(res, cookies, session);
    res.status(status).json({
      tokenType: "Bearer",
      expiresIn: session.accessTtl,
      user: session.user,
      ...(config.tokenInBody && { token: session.accessToken }),
    });
  };
  const refreshCookie = (req) => readCookie(req, cookieNames(cookies).refresh);

  router.post("/register", limiters.register, validate({ body: registerSchema }), async (req, res) => {
    sendSession(res, await auth.register(req.body), 201);
  });

  router.post("/login", limiters.loginByIp, validate({ body: loginSchema }), limiters.loginByEmail, async (req, res) => {
    sendSession(res, await auth.login(req.body));
  });

  // Un refresh que no vale borra las cookies: el cliente vuelve al login
  router.post("/refresh", limiters.refresh, async (req, res) => {
    try {
      sendSession(res, await auth.refresh(refreshCookie(req)));
    } catch (error) {
      if (error.status === 401) clearSessionCookies(res, cookies);
      throw error;
    }
  });

  // Sin authenticate: se puede salir aunque el token de acceso haya caducado. Si llega uno que
  // vale, además va a la lista negra; si no vale, se ignora
  router.post("/logout", async (req, res) => {
    let access = null;
    try {
      access = await tokens.verifyAccess(readAccessToken(req, cookies));
    } catch {
      access = null;
    }
    await auth.logout({ refreshToken: refreshCookie(req), access });
    clearSessionCookies(res, cookies);
    res.status(204).send();
  });

  // Cierra todas las sesiones del usuario, en todos los dispositivos
  router.post("/logout-all", authenticate, async (req, res) => {
    await auth.logoutAll(req.user);
    clearSessionCookies(res, cookies);
    res.status(204).send();
  });

  router.get("/me", authenticate, (req, res) => {
    res.json(req.user);
  });

  // Cierra las demás sesiones y deja esta abierta con tokens nuevos
  router.patch("/password", authenticate, validate({ body: changePasswordSchema }), async (req, res) => {
    sendSession(res, await auth.changePassword(req.user, req.body));
  });

  return router;
}
