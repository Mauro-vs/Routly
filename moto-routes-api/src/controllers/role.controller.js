import { roleService } from "../services/role.service.js";
import { sendList } from "../utils/listQuery.js";

// Cada método lee la petición, llama al service y responde. No hace falta try/catch: Express 5
// manda solo al errorHandler global (con el mismo formato) cualquier error de un async.
export const roleController = {
  async list(req, res) {
    sendList(res, await roleService.search(req.query));
  },

  async listActives(req, res) {
    res.json(await roleService.listByActive(true));
  },

  async listInactives(req, res) {
    res.json(await roleService.listByActive(false));
  },

  async listDeleted(req, res) {
    res.json(await roleService.listDeleted());
  },

  async getById(req, res) {
    res.json(await roleService.getById(req.params.id));
  },

  async getBySlug(req, res) {
    res.json(await roleService.getBySlug(req.params.slug));
  },

  async create(req, res) {
    const role = await roleService.create(req.body);
    res.status(201).json(role);
  },

  async update(req, res) {
    res.json(await roleService.update(req.params.id, req.body));
  },

  async setActive(req, res) {
    res.json(await roleService.setActive(req.params.id, req.body.isActive));
  },

  async remove(req, res) {
    await roleService.remove(req.params.id);
    res.status(204).send();
  },

  async restore(req, res) {
    res.json(await roleService.restore(req.params.id, req.body.isActive));
  },
};
