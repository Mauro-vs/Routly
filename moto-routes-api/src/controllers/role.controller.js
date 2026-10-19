import { roleService } from "../services/role.service.js";

// Cada método lee la petición, llama al service y responde. Los errores (de Zod, del
// service o de Mongoose) se pasan con next() al errorHandler global, que responde
// siempre con el mismo formato.
export const roleController = {
  async list(req, res, next) {
    try {
      res.json(await roleService.list());
    } catch (error) {
      next(error);
    }
  },

  async listActives(req, res, next) {
    try {
      res.json(await roleService.listByActive(true));
    } catch (error) {
      next(error);
    }
  },

  async listInactives(req, res, next) {
    try {
      res.json(await roleService.listByActive(false));
    } catch (error) {
      next(error);
    }
  },

  async listDeleted(req, res, next) {
    try {
      res.json(await roleService.listDeleted());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      res.json(await roleService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async getBySlug(req, res, next) {
    try {
      res.json(await roleService.getBySlug(req.params.slug));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const role = await roleService.create(req.body);
      res.status(201).json(role);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      res.json(await roleService.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  },

  async setActive(req, res, next) {
    try {
      res.json(await roleService.setActive(req.params.id, req.body.isActive));
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await roleService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async restore(req, res, next) {
    try {
      res.json(await roleService.restore(req.params.id, req.body.isActive));
    } catch (error) {
      next(error);
    }
  },
};
