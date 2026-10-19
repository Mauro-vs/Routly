import { categoryService } from "../services/category.service.js";

// Cada método lee la petición, llama al service y responde. Los errores (de Zod, del
// service o de Mongoose) se pasan con next() al errorHandler global, que responde
// siempre con el mismo formato.
export const categoryController = {
  async list(req, res, next) {
    try {
      res.json(await categoryService.list());
    } catch (error) {
      next(error);
    }
  },

  async listActives(req, res, next) {
    try {
      res.json(await categoryService.listByActive(true));
    } catch (error) {
      next(error);
    }
  },

  async listInactives(req, res, next) {
    try {
      res.json(await categoryService.listByActive(false));
    } catch (error) {
      next(error);
    }
  },

  async listDeleted(req, res, next) {
    try {
      res.json(await categoryService.listDeleted());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      res.json(await categoryService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async getBySlug(req, res, next) {
    try {
      res.json(await categoryService.getBySlug(req.params.slug));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const category = await categoryService.create(req.body);
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      res.json(await categoryService.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  },

  async setActive(req, res, next) {
    try {
      res.json(await categoryService.setActive(req.params.id, req.body.isActive));
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await categoryService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async restore(req, res, next) {
    try {
      res.json(await categoryService.restore(req.params.id, req.body.isActive));
    } catch (error) {
      next(error);
    }
  },
};
