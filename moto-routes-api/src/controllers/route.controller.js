import { routeService } from "../services/route.service.js";

// Express 5 envía automáticamente al errorHandler cualquier error lanzado en un
// handler async, por eso no hace falta try/catch en cada método.
export const routeController = {
  async list(req, res) {
    res.json(await routeService.list());
  },

  async listActives(req, res) {
    res.json(await routeService.listByActive(true));
  },

  async listInactives(req, res) {
    res.json(await routeService.listByActive(false));
  },

  async listDeleted(req, res) {
    res.json(await routeService.listDeleted());
  },

  async getById(req, res) {
    res.json(await routeService.getById(req.params.id));
  },

  async getBySlug(req, res) {
    res.json(await routeService.getBySlug(req.params.slug));
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
