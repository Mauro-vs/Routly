import { bikeService } from "../services/bike.service.js";
import { scopeOf } from "../services/visibility.js";
import { sendList } from "../utils/listQuery.js";

// Cada método lee la petición, llama al service y responde. No hace falta try/catch: Express 5
// manda solo al errorHandler global (con el mismo formato) cualquier error de un async.
// En las lecturas sueltas se pasa el usuario (o null si es anónimo): su dueño ve una moto
// aunque sea privada o esté inactiva.
export const bikeController = {
  async list(req, res) {
    sendList(res, await bikeService.search(req.query, scopeOf(req.user)));
  },

  async listActives(req, res) {
    res.json(await bikeService.listByActive(true, scopeOf(req.user)));
  },

  async listInactives(req, res) {
    res.json(await bikeService.listByActive(false));
  },

  async listDeleted(req, res) {
    res.json(await bikeService.listDeleted());
  },

  async listMine(req, res) {
    res.json(await bikeService.listMine(req.user));
  },

  async getById(req, res) {
    res.json(await bikeService.getById(req.params.id, req.user ?? null));
  },

  async getBySlug(req, res) {
    res.json(await bikeService.getBySlug(req.params.slug, req.user ?? null));
  },

  async create(req, res) {
    const bike = await bikeService.create(req.body, req.user);
    res.status(201).json(bike);
  },

  async update(req, res) {
    res.json(await bikeService.update(req.params.id, req.body, req.user));
  },

  async setActive(req, res) {
    res.json(await bikeService.setActive(req.params.id, req.body.isActive, req.user));
  },

  async remove(req, res) {
    await bikeService.remove(req.params.id, req.user);
    res.status(204).send();
  },

  async restore(req, res) {
    res.json(await bikeService.restore(req.params.id, req.body.isActive, req.user));
  },
};
