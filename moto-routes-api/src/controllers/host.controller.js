import { hostService } from "../services/host.service.js";
import { scopeOf } from "../services/visibility.js";

// Cada método lee la petición, llama al service y responde. Los errores (de Zod, del
// service o de Mongoose) se pasan con next() al errorHandler global, que responde
// siempre con el mismo formato.
export const hostController = {
  async list(req, res, next) {
    try {
      res.json(await hostService.list(scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async listActives(req, res, next) {
    try {
      res.json(await hostService.listByActive(true, scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async listInactives(req, res, next) {
    try {
      res.json(await hostService.listByActive(false));
    } catch (error) {
      next(error);
    }
  },

  async listDeleted(req, res, next) {
    try {
      res.json(await hostService.listDeleted());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      res.json(await hostService.getById(req.params.id, scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async getBySlug(req, res, next) {
    try {
      res.json(await hostService.getBySlug(req.params.slug, scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const host = await hostService.create(req.body);
      res.status(201).json(host);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      res.json(await hostService.update(req.params.id, req.body, req.user));
    } catch (error) {
      next(error);
    }
  },

  async setActive(req, res, next) {
    try {
      res.json(await hostService.setActive(req.params.id, req.body.isActive, req.user));
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await hostService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async restore(req, res, next) {
    try {
      res.json(await hostService.restore(req.params.id, req.body.isActive));
    } catch (error) {
      next(error);
    }
  },
};
