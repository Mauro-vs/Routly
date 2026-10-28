import { authService } from "../services/auth.service.js";
import { userService } from "../services/user.service.js";

// El perfil es del usuario: todo pasa por userService, nunca por profileService.
// "me" sale siempre de req.user (el token), nunca del body ni de la URL.
export const profileController = {
  async getMe(req, res, next) {
    try {
      res.json(await userService.getById(req.user.id));
    } catch (error) {
      next(error);
    }
  },

  async updateMe(req, res, next) {
    try {
      res.json(await userService.update(req.user.id, req.body, req.user));
    } catch (error) {
      next(error);
    }
  },

  // Las demás sesiones se cierran: se devuelve un token nuevo para seguir en esta
  async changePassword(req, res, next) {
    try {
      await userService.changePassword(req.user.id, req.body);
      res.json(await authService.session(req.user.id));
    } catch (error) {
      next(error);
    }
  },

  async getByUserId(req, res, next) {
    try {
      res.json(await userService.getById(req.params.userId));
    } catch (error) {
      next(error);
    }
  },

  async updateByUserId(req, res, next) {
    try {
      res.json(await userService.update(req.params.userId, req.body, req.user));
    } catch (error) {
      next(error);
    }
  },
};
