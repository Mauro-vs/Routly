import { reviewService } from "../services/review.service.js";
import { sendList } from "../utils/listQuery.js";

// Cada método lee la petición, llama al service y responde. Los errores (de Zod, del service o de
// Mongoose) se pasan con next() al errorHandler global. Las de la tienda están en shop.controller.js
export const reviewController = {
  async list(req, res, next) {
    try {
      sendList(res, await reviewService.search(req.query));
    } catch (error) {
      next(error);
    }
  },

  async listInactives(req, res, next) {
    try {
      res.json(await reviewService.listByActive(false));
    } catch (error) {
      next(error);
    }
  },

  async listDeleted(req, res, next) {
    try {
      res.json(await reviewService.listDeleted());
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      res.json(await reviewService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      res.status(201).json(await reviewService.create(req.body, req.user));
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      res.json(await reviewService.update(req.params.id, req.body, req.user));
    } catch (error) {
      next(error);
    }
  },

  async setActive(req, res, next) {
    try {
      res.json(await reviewService.setActive(req.params.id, req.body.isActive));
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await reviewService.remove(req.params.id, req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  // Antes de multer: que la opinión sea tuya y quepa otra foto (si no, el archivo ni se recibe)
  async checkPhotoSlot(req, res, next) {
    try {
      await reviewService.assertCanAddPhoto(req.params.id, req.user);
      next();
    } catch (error) {
      next(error);
    }
  },

  async addPhoto(req, res, next) {
    try {
      res.status(201).json(await reviewService.addPhoto(req.params.id, req.file, req.user));
    } catch (error) {
      next(error);
    }
  },

  async removePhoto(req, res, next) {
    try {
      res.json(await reviewService.removePhoto(req.params.id, req.params.photoId, req.user));
    } catch (error) {
      next(error);
    }
  },

  async restore(req, res, next) {
    try {
      res.json(await reviewService.restore(req.params.id, req.body.isActive, req.user));
    } catch (error) {
      next(error);
    }
  },
};
