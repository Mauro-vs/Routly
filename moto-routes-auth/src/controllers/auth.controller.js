import { clearSessionCookies, cookieNames, readCookie, setSessionCookies } from "../utils/cookies.js";
import { readAccessToken } from "../middlewares/authenticate.js";

/**
 * Los endpoints de la sesión. Cada método lee la petición, llama al service y responde. Sin
 * try/catch: Express 5 manda solo al errorHandler cualquier error de un async (solo /refresh
 * captura uno, para borrar las cookies antes).
 *
 * Una sesión responde { tokenType, expiresIn, refreshExpiresIn, user } y deja las dos cookies.
 * refreshExpiresIn le dice al panel hasta cuándo puede renovar sin volver a entrar. El token de acceso
 * solo va también en el body si TOKEN_IN_BODY (por defecto, fuera de producción): para Swagger,
 * Postman y los tests. El refresh nunca sale del body: solo en su cookie.
 *
 * Los services y la configuración llegan por parámetro (los crea app.js), como en los tests.
 */
export function createAuthController({ auth, tokens, config }) {
  const { cookies } = config;

  const sendSession = (res, session, status = 200) => {
    setSessionCookies(res, cookies, session);
    res.status(status).json({
      tokenType: "Bearer",
      expiresIn: session.accessTtl,
      refreshExpiresIn: session.refreshTtl,
      user: session.user,
      ...(config.tokenInBody && { token: session.accessToken }),
    });
  };
  const refreshCookie = (req) => readCookie(req, cookieNames(cookies).refresh);

  return {
    async register(req, res) {
      sendSession(res, await auth.register(req.body), 201);
    },

    async login(req, res) {
      sendSession(res, await auth.login(req.body));
    },

    // Un refresh que no vale borra las cookies: el cliente vuelve al login
    async refresh(req, res) {
      try {
        sendSession(res, await auth.refresh(refreshCookie(req)));
      } catch (error) {
        if (error.status === 401) clearSessionCookies(res, cookies);
        throw error;
      }
    },

    // Sin authenticate: se puede salir aunque el token de acceso haya caducado. Si llega uno que
    // vale, además va a la lista negra; si no vale, se ignora
    async logout(req, res) {
      const access = await tokens.verifyAccess(readAccessToken(req, cookies)).catch(() => null);
      await auth.logout({ refreshToken: refreshCookie(req), access });
      clearSessionCookies(res, cookies);
      res.status(204).send();
    },

    // Cierra todas las sesiones del usuario, en todos los dispositivos
    async logoutAll(req, res) {
      await auth.logoutAll(req.user);
      clearSessionCookies(res, cookies);
      res.status(204).send();
    },

    me(req, res) {
      res.json(req.user);
    },

    // Cierra las demás sesiones y deja esta abierta con tokens nuevos
    async changePassword(req, res) {
      sendSession(res, await auth.changePassword(req.user, req.body));
    },
  };
}
