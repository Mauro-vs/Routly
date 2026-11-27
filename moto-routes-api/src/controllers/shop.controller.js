import { shopService } from "../services/shop.service.js";

// La tienda pública responde { data } y, en el listado, { data, pagination }. El resto de la API
// responde el documento o el array tal cual: es lo que pide la web pública (ver el README).
// Las opiniones de la tienda están en review.controller.js. Sin try/catch: Express 5 manda los
// errores de un async al errorHandler.
const carousel = (kind) => async (req, res) => {
  res.json({ data: await shopService.carousel(kind, req.query) });
};

export const shopController = {
  categories: carousel("categories"),
  hosts: carousel("hosts"),
  locations: carousel("locations"),

  async experiences(req, res) {
    res.json(await shopService.experiences(req.query));
  },

  async experience(req, res) {
    res.json({ data: await shopService.experience(req.params.slug) });
  },

  async departures(req, res) {
    res.json({ data: await shopService.departures(req.params.slug) });
  },

  async host(req, res) {
    res.json({ data: await shopService.host(req.params.slug) });
  },
};
