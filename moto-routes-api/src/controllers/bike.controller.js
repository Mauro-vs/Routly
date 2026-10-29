import { bikeService } from "../services/bike.service.js";
import { scopeOf } from "../services/visibility.js";

// Cada método lee la petición, llama al service y responde. Los errores (de Zod, del
// service o de Mongoose) se pasan con next() al errorHandler global.
// En las lecturas sueltas se pasa el usuario (o null si es anónimo): su dueño ve una moto
// aunque sea privada o esté inactiva.
export const bikeController = {
  async list(req, res, next) {
    try {
      res.json(await bikeService.list(scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async listActives(req, res, next) {
    try {
      res.json(await bikeService.listByActive(true, scopeOf(req.user)));
    } catch (error) {
      next(error);
    }
  },

  async listInactives(req, res, next) {
    try {
      res.json(await bikeService.listByActive(false));
    } catch (error) {
      next(error);
    }
  },

  async listDeleted(req, res, next) {
    try {
      res.json(await bikeService.listDeleted());
    } catch (error) {
      next(error);
    }
  },

  async listMine(req, res, next) {
    try {
      res.json(await bikeService.listMine(req.user));
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      res.json(await bikeService.getById(req.params.id, req.user ?? null));
    } catch (error) {
      next(error);
    }
  },

  async getBySlug(req, res, next) {
    try {
      res.json(await bikeService.getBySlug(req.params.slug, req.user ?? null));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const bike = await bikeService.create(req.body, req.user);
      res.status(201).json(bike);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      res.json(await bikeService.update(req.params.id, req.body, req.user));
    } catch (error) {
      next(error);
    }
  },

  async setActive(req, res, next) {
    try {
      res.json(await bikeService.setActive(req.params.id, req.body.isActive, req.user));
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await bikeService.remove(req.params.id, req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async restore(req, res, next) {
    try {
      res.json(await bikeService.restore(req.params.id, req.body.isActive, req.user));
    } catch (error) {
      next(error);
    }
  },
};
