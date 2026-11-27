import { userService } from "../services/user.service.js";
import { sendList } from "../utils/listQuery.js";

// Cada método lee la petición, llama al service y responde. No hace falta try/catch: Express 5
// manda solo al errorHandler global (con el mismo formato) cualquier error de un async.
export const userController = {
  async list(req, res) {
    sendList(res, await userService.search(req.query));
  },

  async listActives(req, res) {
    res.json(await userService.listByActive(true));
  },

  async listInactives(req, res) {
    res.json(await userService.listByActive(false));
  },

  async listDeleted(req, res) {
    res.json(await userService.listDeleted());
  },

  async getById(req, res) {
    res.json(await userService.getById(req.params.id));
  },

  async getBySlug(req, res) {
    res.json(await userService.getBySlug(req.params.slug));
  },

  async create(req, res) {
    const user = await userService.create(req.body, req.user);
    res.status(201).json(user);
  },

  async update(req, res) {
    res.json(await userService.update(req.params.id, req.body, req.user));
  },

  async setActive(req, res) {
    res.json(await userService.setActive(req.params.id, req.body.isActive, req.user));
  },

  async remove(req, res) {
    await userService.remove(req.params.id, req.user);
    res.status(204).send();
  },

  async restore(req, res) {
    res.json(await userService.restore(req.params.id, req.body.isActive));
  },
};
