import { authService } from "../services/auth.service.js";

// Cada método lee la petición, llama al service y responde. Los errores pasan con
// next() al errorHandler global.
export const authController = {
  async register(req, res, next) {
    try {
      res.status(201).json(await authService.register(req.body));
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      res.json(await authService.login(req.body));
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
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async logoutAll(req, res, next) {
    try {
      await authService.logoutAll(req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
