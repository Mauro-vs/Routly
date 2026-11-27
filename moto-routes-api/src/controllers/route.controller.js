import { routeService } from "../services/route.service.js";
import { scopeOf } from "../services/visibility.js";
import { sendList } from "../utils/listQuery.js";

// Cada método lee la petición, llama al service y responde. No hace falta try/catch: Express 5
// manda solo al errorHandler global (con el mismo formato) cualquier error de un async.
export const routeController = {
  async list(req, res) {
    sendList(res, await routeService.search(req.query, scopeOf(req.user)));
  },

  async listActives(req, res) {
    res.json(await routeService.listByActive(true, scopeOf(req.user)));
  },

  async listInactives(req, res) {
    res.json(await routeService.listByActive(false));
  },

  async listDeleted(req, res) {
    res.json(await routeService.listDeleted());
  },

  async getById(req, res) {
    res.json(await routeService.getById(req.params.id, scopeOf(req.user)));
  },

  async getBySlug(req, res) {
    res.json(await routeService.getBySlug(req.params.slug, scopeOf(req.user)));
  },

  async create(req, res) {
    const route = await routeService.create(req.body);
    res.status(201).json(route);
  },

  async update(req, res) {
    res.json(await routeService.update(req.params.id, req.body));
  },

  async setActive(req, res) {
    res.json(await routeService.setActive(req.params.id, req.body.isActive));
  },

  async remove(req, res) {
    await routeService.remove(req.params.id);
    res.status(204).send();
  },

  async restore(req, res) {
    res.json(await routeService.restore(req.params.id, req.body.isActive));
  },
};
