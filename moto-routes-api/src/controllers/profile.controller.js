import { userService } from "../services/user.service.js";

// El perfil es del usuario: todo pasa por userService, nunca por profileService.
// "me" sale siempre de req.user (el token), nunca del body ni de la URL.
export const profileController = {
  async getMe(req, res) {
    res.json(await userService.getById(req.user.id));
  },

  async updateMe(req, res) {
    res.json(await userService.update(req.user.id, req.body, req.user));
  },

  async getByUserId(req, res) {
    res.json(await userService.getById(req.params.userId));
  },

  async updateByUserId(req, res) {
    res.json(await userService.update(req.params.userId, req.body, req.user));
  },
};
