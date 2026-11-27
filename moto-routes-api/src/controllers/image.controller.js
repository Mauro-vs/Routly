import { imageService } from "../services/image.service.js";
import { scopeOf } from "../services/visibility.js";
import { sendList } from "../utils/listQuery.js";

// Cada método lee la petición, llama al service y responde. No hace falta try/catch: Express 5
// manda solo al errorHandler global (con el mismo formato) cualquier error de un async.
export const imageController = {
  async list(req, res) {
    sendList(res, await imageService.search(req.query, scopeOf(req.user)));
  },

  async listActives(req, res) {
    res.json(await imageService.listByActive(true, scopeOf(req.user)));
  },

  async listInactives(req, res) {
    res.json(await imageService.listByActive(false));
  },

  async listDeleted(req, res) {
    res.json(await imageService.listDeleted());
  },

  async getById(req, res) {
    res.json(await imageService.getById(req.params.id, scopeOf(req.user)));
  },

  async create(req, res) {
    const image = await imageService.create(req.body, req.user);
    res.status(201).json(image);
  },

  async update(req, res) {
    res.json(await imageService.update(req.params.id, req.body, req.user));
  },

  async setActive(req, res) {
    res.json(await imageService.setActive(req.params.id, req.body.isActive, req.user));
  },

  async remove(req, res) {
    await imageService.remove(req.params.id, req.user);
    res.status(204).send();
  },

  async restore(req, res) {
    res.json(await imageService.restore(req.params.id, req.body.isActive, req.user));
  },
};
