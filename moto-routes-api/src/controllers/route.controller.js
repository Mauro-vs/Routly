import { routeService } from "../services/route.service.js";
import { scopeOf } from "../services/visibility.js";

// Cada método lee la petición, llama al service y responde. Los errores (de Zod, del
// service o de Mongoose) se pasan con next() al errorHandler global, que responde
// siempre con el mismo formato.
export const routeController = {
  async list(req, res, next) {
    try {
      res.json(await routeService.list(scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async listActives(req, res, next) {
    try {
      res.json(await routeService.listByActive(true, scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async listInactives(req, res, next) {
    try {
      res.json(await routeService.listByActive(false));
    } catch (error) {
      next(error);
    }
  },

  async listDeleted(req, res, next) {
    try {
      res.json(await routeService.listDeleted());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      res.json(await routeService.getById(req.params.id, scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async getBySlug(req, res, next) {
    try {
      res.json(await routeService.getBySlug(req.params.slug, scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const route = await routeService.create(req.body);
      res.status(201).json(route);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      res.json(await routeService.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  },

  async setActive(req, res, next) {
    try {
      res.json(await routeService.setActive(req.params.id, req.body.isActive));
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await routeService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async restore(req, res, next) {
    try {
      res.json(await routeService.restore(req.params.id, req.body.isActive));
    } catch (error) {
      next(error);
    }
  },
};
