import { locationService } from "../services/location.service.js";
import { scopeOf } from "../services/visibility.js";
import { sendList } from "../utils/listQuery.js";

// Cada método lee la petición, llama al service y responde. No hace falta try/catch: Express 5
// manda solo al errorHandler global (con el mismo formato) cualquier error de un async.
export const locationController = {
  async list(req, res) {
    sendList(res, await locationService.search(req.query, scopeOf(req.user)));
  },

  async listActives(req, res) {
    res.json(await locationService.listByActive(true, scopeOf(req.user)));
  },

  async listInactives(req, res) {
    res.json(await locationService.listByActive(false));
  },

  async listDeleted(req, res) {
    res.json(await locationService.listDeleted());
  },

  async getById(req, res) {
    res.json(await locationService.getById(req.params.id, scopeOf(req.user)));
  },

  async getBySlug(req, res) {
    res.json(await locationService.getBySlug(req.params.slug, scopeOf(req.user)));
  },

  async create(req, res) {
    const location = await locationService.create(req.body);
    res.status(201).json(location);
  },

  async update(req, res) {
    res.json(await locationService.update(req.params.id, req.body));
  },

  async setActive(req, res) {
    res.json(await locationService.setActive(req.params.id, req.body.isActive));
  },

  async remove(req, res) {
    await locationService.remove(req.params.id);
    res.status(204).send();
  },

  async restore(req, res) {
    res.json(await locationService.restore(req.params.id, req.body.isActive));
  },
};
