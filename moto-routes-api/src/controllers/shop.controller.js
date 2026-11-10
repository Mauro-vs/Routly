import { shopService } from "../services/shop.service.js";

// La tienda pública responde { data } y, en el listado, { data, pagination }. El resto de la API
// responde el documento o el array tal cual: es lo que pide la web pública (ver el README).
const carousel = (kind) => async (req, res, next) => {
  try {
    res.json({ data: await shopService.carousel(kind, req.query) });
  } catch (error) {
    next(error);
  }
};

export const shopController = {
  categories: carousel("categories"),
  hosts: carousel("hosts"),
  locations: carousel("locations"),

  async experiences(req, res, next) {
    try {
      res.json(await shopService.experiences(req.query));
    } catch (error) {
      next(error);
    }
  },

  async experience(req, res, next) {
    try {
      res.json({ data: await shopService.experience(req.params.slug) });
    } catch (error) {
      next(error);
    }
  },

  async departures(req, res, next) {
    try {
      res.json({ data: await shopService.departures(req.params.slug) });
    } catch (error) {
      next(error);
    }
  },
};
