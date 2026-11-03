import { authService } from "../services/auth.service.js";
import { clearSessionCookie, sendSession } from "../utils/session-cookie.js";

// Cada método lee la petición, llama al service y responde. Los errores pasan con
// next() al errorHandler global. La sesión, además del body, deja la cookie httpOnly
// del panel (utils/session-cookie.js), y cerrar sesión la borra.
export const authController = {
  async register(req, res, next) {
    try {
      sendSession(res, await authService.register(req.body), 201);
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      sendSession(res, await authService.login(req.body));
    } catch (error) {
      next(error);
    }
  },

  async me(req, res, next) {
    try {
      res.json(await authService.me(req.user));
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res, next) {
    try {
      await authService.logout(req.user, req.auth);
      clearSessionCookie(res);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async logoutAll(req, res, next) {
    try {
      await authService.logoutAll(req.user);
      clearSessionCookie(res);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
