import { experienceService } from "../services/experience.service.js";
import { scopeOf } from "../services/visibility.js";
import { sendList } from "../utils/listQuery.js";

// Cada método lee la petición, llama al service y responde. No hace falta try/catch: Express 5
// manda solo al errorHandler global (con el mismo formato) cualquier error de un async.
export const experienceController = {
  async list(req, res) {
    sendList(res, await experienceService.search(req.query, scopeOf(req.user)));
  },

  async listActives(req, res) {
    res.json(await experienceService.listByActive(true, scopeOf(req.user)));
  },

  async listInactives(req, res) {
    res.json(await experienceService.listByActive(false));
  },

  async listDeleted(req, res) {
    res.json(await experienceService.listDeleted());
  },

  async getById(req, res) {
    res.json(await experienceService.getById(req.params.id, scopeOf(req.user)));
  },

  async getBySlug(req, res) {
    res.json(await experienceService.getBySlug(req.params.slug, scopeOf(req.user)));
  },

  async create(req, res) {
    const experience = await experienceService.create(req.body, req.user);
    res.status(201).json(experience);
  },

  async update(req, res) {
    res.json(await experienceService.update(req.params.id, req.body, req.user));
  },

  async setActive(req, res) {
    res.json(await experienceService.setActive(req.params.id, req.body.isActive, req.user));
  },

  async remove(req, res) {
    await experienceService.remove(req.params.id, req.user);
    res.status(204).send();
  },

  async restore(req, res) {
    res.json(await experienceService.restore(req.params.id, req.body.isActive, req.user));
  },
};
