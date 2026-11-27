import { departureService } from "../services/departure.service.js";
import { scopeOf } from "../services/visibility.js";
import { sendList } from "../utils/listQuery.js";

// Cada método lee la petición, llama al service y responde. No hace falta try/catch: Express 5
// manda solo al errorHandler global (con el mismo formato) cualquier error de un async.
export const departureController = {
  async list(req, res) {
    sendList(res, await departureService.search(req.query, scopeOf(req.user)));
  },

  async listActives(req, res) {
    res.json(await departureService.listByActive(true, scopeOf(req.user)));
  },

  async listInactives(req, res) {
    res.json(await departureService.listByActive(false));
  },

  async listDeleted(req, res) {
    res.json(await departureService.listDeleted());
  },

  async getById(req, res) {
    res.json(await departureService.getById(req.params.id, scopeOf(req.user)));
  },

  async getBySlug(req, res) {
    res.json(await departureService.getBySlug(req.params.slug, scopeOf(req.user)));
  },

  async getBySku(req, res) {
    res.json(await departureService.getBySku(req.params.sku, scopeOf(req.user)));
  },

  async create(req, res) {
    const departure = await departureService.create(req.body, req.user);
    res.status(201).json(departure);
  },

  async update(req, res) {
    res.json(await departureService.update(req.params.id, req.body, req.user));
  },

  async setActive(req, res) {
    res.json(await departureService.setActive(req.params.id, req.body.isActive, req.user));
  },

  async remove(req, res) {
    await departureService.remove(req.params.id, req.user);
    res.status(204).send();
  },

  async restore(req, res) {
    res.json(await departureService.restore(req.params.id, req.body.isActive, req.user));
  },
};
