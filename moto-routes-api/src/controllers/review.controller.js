import { reviewService } from "../services/review.service.js";
import { sendList } from "../utils/listQuery.js";

// Todas las opiniones en un controller: las de la tienda (leer, públicas, y "la mía") y las de
// /api/reviews (escribir con sesión y moderar en el panel). Cada método lee la petición, llama al
// service y responde. No hace falta try/catch: Express 5 manda solo al errorHandler global
// cualquier error de un async.
export const reviewController = {
  // ---------- La tienda: /api/shop/{experiences|hosts}/:slug/reviews ----------

  // Las opiniones de una experiencia o un guía: { data, pagination, summary }
  listForTarget: (targetType) => async (req, res) => {
    res.json(await reviewService.listForTarget(targetType, req.params.slug, req.query));
  },

  // Mi opinión y si puedo opinar: { data: { review, canReview, reason } }
  mine: (targetType) => async (req, res) => {
    res.json({ data: await reviewService.mine(targetType, req.params.slug, req.user) });
  },

  // ---------- Escribir (con sesión) ----------

  async create(req, res) {
    res.status(201).json(await reviewService.create(req.body, req.user));
  },

  async update(req, res) {
    res.json(await reviewService.update(req.params.id, req.body, req.user));
  },

  async remove(req, res) {
    await reviewService.remove(req.params.id, req.user);
    res.status(204).send();
  },

  // Antes de multer: que la opinión sea tuya y quepa otra foto (si no, el archivo ni se recibe).
  // Es un middleware: si todo va bien, sigue con next()
  async checkPhotoSlot(req, res, next) {
    await reviewService.assertCanAddPhoto(req.params.id, req.user);
    next();
  },

  async addPhoto(req, res) {
    res.status(201).json(await reviewService.addPhoto(req.params.id, req.file, req.user));
  },

  async removePhoto(req, res) {
    res.json(await reviewService.removePhoto(req.params.id, req.params.photoId, req.user));
  },

  // ---------- La moderación del panel (solo admin) ----------

  async list(req, res) {
    sendList(res, await reviewService.search(req.query));
  },

  async listInactives(req, res) {
    res.json(await reviewService.listByActive(false));
  },

  async listDeleted(req, res) {
    res.json(await reviewService.listDeleted());
  },

  async getById(req, res) {
    res.json(await reviewService.getById(req.params.id));
  },

  async setActive(req, res) {
    res.json(await reviewService.setActive(req.params.id, req.body.isActive));
  },

  async restore(req, res) {
    res.json(await reviewService.restore(req.params.id, req.body.isActive, req.user));
  },
};
