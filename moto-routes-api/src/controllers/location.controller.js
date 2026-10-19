import { locationService } from "../services/location.service.js";

// Cada método lee la petición, llama al service y responde. Los errores (de Zod, del
// service o de Mongoose) se pasan con next() al errorHandler global, que responde
// siempre con el mismo formato.
export const locationController = {
  async list(req, res, next) {
    try {
      res.json(await locationService.list());
    } catch (error) {
      next(error);
    }
  },

  async listActives(req, res, next) {
    try {
      res.json(await locationService.listByActive(true));
    } catch (error) {
      next(error);
    }
  },

  async listInactives(req, res, next) {
    try {
      res.json(await locationService.listByActive(false));
    } catch (error) {
      next(error);
    }
  },

  async listDeleted(req, res, next) {
    try {
      res.json(await locationService.listDeleted());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      res.json(await locationService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async getBySlug(req, res, next) {
    try {
      res.json(await locationService.getBySlug(req.params.slug));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const location = await locationService.create(req.body);
      res.status(201).json(location);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      res.json(await locationService.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  },

  async setActive(req, res, next) {
    try {
      res.json(await locationService.setActive(req.params.id, req.body.isActive));
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await locationService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async restore(req, res, next) {
    try {
      res.json(await locationService.restore(req.params.id, req.body.isActive));
    } catch (error) {
      next(error);
    }
  },
};
