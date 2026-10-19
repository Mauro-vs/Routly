import { experienceService } from "../services/experience.service.js";

// Cada método lee la petición, llama al service y responde. Los errores (de Zod, del
// service o de Mongoose) se pasan con next() al errorHandler global, que responde
// siempre con el mismo formato.
export const experienceController = {
  async list(req, res, next) {
    try {
      res.json(await experienceService.list());
    } catch (error) {
      next(error);
    }
  },

  async listActives(req, res, next) {
    try {
      res.json(await experienceService.listByActive(true));
    } catch (error) {
      next(error);
    }
  },

  async listInactives(req, res, next) {
    try {
      res.json(await experienceService.listByActive(false));
    } catch (error) {
      next(error);
    }
  },

  async listDeleted(req, res, next) {
    try {
      res.json(await experienceService.listDeleted());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      res.json(await experienceService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async getBySlug(req, res, next) {
    try {
      res.json(await experienceService.getBySlug(req.params.slug));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const experience = await experienceService.create(req.body);
      res.status(201).json(experience);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      res.json(await experienceService.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  },

  async setActive(req, res, next) {
    try {
      res.json(await experienceService.setActive(req.params.id, req.body.isActive));
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await experienceService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async restore(req, res, next) {
    try {
      res.json(await experienceService.restore(req.params.id, req.body.isActive));
    } catch (error) {
      next(error);
    }
  },
};
