import { imageService } from "../services/image.service.js";

// Cada método lee la petición, llama al service y responde. Los errores (de Zod, del
// service o de Mongoose) se pasan con next() al errorHandler global, que responde
// siempre con el mismo formato.
export const imageController = {
  async list(req, res, next) {
    try {
      res.json(await imageService.list(req.query));
    } catch (error) {
      next(error);
    }
  },

  async listActives(req, res, next) {
    try {
      res.json(await imageService.listByActive(true));
    } catch (error) {
      next(error);
    }
  },

  async listInactives(req, res, next) {
    try {
      res.json(await imageService.listByActive(false));
    } catch (error) {
      next(error);
    }
  },

  async listDeleted(req, res, next) {
    try {
      res.json(await imageService.listDeleted());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      res.json(await imageService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const image = await imageService.create(req.body);
      res.status(201).json(image);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      res.json(await imageService.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  },

  async setActive(req, res, next) {
    try {
      res.json(await imageService.setActive(req.params.id, req.body.isActive));
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await imageService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async restore(req, res, next) {
    try {
      res.json(await imageService.restore(req.params.id, req.body.isActive));
    } catch (error) {
      next(error);
    }
  },
};
