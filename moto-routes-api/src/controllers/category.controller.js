import { categoryService } from "../services/category.service.js";
import { scopeOf } from "../services/visibility.js";
import { sendList } from "../utils/listQuery.js";

// Cada método lee la petición, llama al service y responde. No hace falta try/catch: Express 5
// manda solo al errorHandler global (con el mismo formato) cualquier error de un async.
export const categoryController = {
  async list(req, res) {
    sendList(res, await categoryService.search(req.query, scopeOf(req.user)));
  },

  async listActives(req, res) {
    res.json(await categoryService.listByActive(true, scopeOf(req.user)));
  },

  async listInactives(req, res) {
    res.json(await categoryService.listByActive(false));
  },

  async listDeleted(req, res) {
    res.json(await categoryService.listDeleted());
  },

  async getById(req, res) {
    res.json(await categoryService.getById(req.params.id, scopeOf(req.user)));
  },

  async getBySlug(req, res) {
    res.json(await categoryService.getBySlug(req.params.slug, scopeOf(req.user)));
  },

  async create(req, res) {
    const category = await categoryService.create(req.body);
    res.status(201).json(category);
  },

  async update(req, res) {
    res.json(await categoryService.update(req.params.id, req.body));
  },

  async setActive(req, res) {
    res.json(await categoryService.setActive(req.params.id, req.body.isActive));
  },

  async remove(req, res) {
    await categoryService.remove(req.params.id);
    res.status(204).send();
  },

  async restore(req, res) {
    res.json(await categoryService.restore(req.params.id, req.body.isActive));
  },
};
