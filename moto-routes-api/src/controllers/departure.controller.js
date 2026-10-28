import { departureService } from "../services/departure.service.js";
import { scopeOf } from "../services/visibility.js";

// Cada método lee la petición, llama al service y responde. Los errores (de Zod, del
// service o de Mongoose) se pasan con next() al errorHandler global, que responde
// siempre con el mismo formato.
export const departureController = {
  async list(req, res, next) {
    try {
      res.json(await departureService.list(scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async listActives(req, res, next) {
    try {
      res.json(await departureService.listByActive(true, scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async listInactives(req, res, next) {
    try {
      res.json(await departureService.listByActive(false));
    } catch (error) {
      next(error);
    }
  },

  async listDeleted(req, res, next) {
    try {
      res.json(await departureService.listDeleted());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      res.json(await departureService.getById(req.params.id, scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async getBySlug(req, res, next) {
    try {
      res.json(await departureService.getBySlug(req.params.slug, scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async getBySku(req, res, next) {
    try {
      res.json(await departureService.getBySku(req.params.sku, scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const departure = await departureService.create(req.body, req.user);
      res.status(201).json(departure);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      res.json(await departureService.update(req.params.id, req.body, req.user));
    } catch (error) {
      next(error);
    }
  },

  async setActive(req, res, next) {
    try {
      res.json(await departureService.setActive(req.params.id, req.body.isActive, req.user));
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await departureService.remove(req.params.id, req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async restore(req, res, next) {
    try {
      res.json(await departureService.restore(req.params.id, req.body.isActive, req.user));
    } catch (error) {
      next(error);
    }
  },
};
