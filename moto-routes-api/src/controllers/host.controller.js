import { hostService } from "../services/host.service.js";
import { scopeOf } from "../services/visibility.js";
import { sendList } from "../utils/listQuery.js";

// Cada método lee la petición, llama al service y responde. No hace falta try/catch: Express 5
// manda solo al errorHandler global (con el mismo formato) cualquier error de un async.
export const hostController = {
  async list(req, res) {
    sendList(res, await hostService.search(req.query, scopeOf(req.user)));
  },

  async listActives(req, res) {
    res.json(await hostService.listByActive(true, scopeOf(req.user)));
  },

  async listInactives(req, res) {
    res.json(await hostService.listByActive(false));
  },

  async listDeleted(req, res) {
    res.json(await hostService.listDeleted());
  },

  async getById(req, res) {
    res.json(await hostService.getById(req.params.id, scopeOf(req.user)));
  },

  async getBySlug(req, res) {
    res.json(await hostService.getBySlug(req.params.slug, scopeOf(req.user)));
  },

  async create(req, res) {
    const host = await hostService.create(req.body);
    res.status(201).json(host);
  },

  async update(req, res) {
    res.json(await hostService.update(req.params.id, req.body, req.user));
  },

  async setActive(req, res) {
    res.json(await hostService.setActive(req.params.id, req.body.isActive, req.user));
  },

  async remove(req, res) {
    await hostService.remove(req.params.id);
    res.status(204).send();
  },

  async restore(req, res) {
    res.json(await hostService.restore(req.params.id, req.body.isActive));
  },
};
