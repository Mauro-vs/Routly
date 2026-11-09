import { Experience } from "../models/experience.model.js";
import { toUpdate } from "../utils/update.js";

// La ruta con lo que enseñan la tarjeta y el detalle de una experiencia en la web pública: sus km,
// horas y dificultad, su categoría y sus dos ubicaciones (la ubicación de una experiencia es la de
// su ruta). Todo en el mismo populate: una consulta por colección, no por experiencia.
const ROUTE_SUMMARY = {
  path: "route",
  select: "title slug distance duration difficulty categoryId startLocationId endLocationId",
  populate: [
    { path: "category", select: "name slug" },
    { path: "startLocation", select: "city region country slug" },
    { path: "endLocation", select: "city region country slug" },
  ],
};

const withRelations = (query) => query.populate("host", "name slug").populate(ROUTE_SUMMARY);

// Los campos por los que se puede ordenar en memoria (sort=priceFrom o nextDepartureAt)
const SORT_KEYS = "_id title duration maxParticipants createdAt updatedAt";

export const experienceRepository = {
  findAll(filter = {}, { sort = { createdAt: -1 }, skip = 0, limit = 0 } = {}) {
    return withRelations(
      Experience.find(filter).sort(sort).skip(skip).limit(limit)
    ).lean();
  },

  // Solo los campos de orden de las que cumplen el filtro: para ordenar por un dato calculado
  // (el precio "desde", la próxima fecha) antes de paginar, sin traer las experiencias enteras
  findSortKeys(filter = {}) {
    return Experience.find(filter).select(SORT_KEYS).lean();
  },

  // Solo el anfitrión y la ruta de las que cumplen el filtro: para las facetas del Home
  findFacetKeys(filter = {}) {
    return Experience.find(filter).select("hostId routeId").lean();
  },

  // El total de un listado paginado (utils/listQuery.js): el mismo filtro, sin los eliminados
  count(filter = {}) {
    return Experience.countDocuments(filter);
  },

  findDeleted() {
    return withRelations(
      Experience.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 })
    ).lean();
  },

  findById(id) {
    return withRelations(Experience.findOne({ _id: id })).lean();
  },

  // Sin relaciones: lo que necesitan las reglas del service antes de escribir
  findPlainById(id) {
    return Experience.findOne({ _id: id }).lean();
  },

  findBySlug(slug) {
    return withRelations(Experience.findOne({ slug })).lean();
  },

  findDeletedById(id) {
    return Experience.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  exists(filter) {
    return Experience.exists(filter);
  },

  // Los ids que cumplen el filtro (sin los eliminados): para services/visibility.js
  findIds(filter) {
    return Experience.distinct("_id", filter);
  },

  create(data) {
    return Experience.create(data);
  },

  updateById(id, data) {
    return Experience.findOneAndUpdate({ _id: id }, toUpdate(data), {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  softDeleteById(id, deletedAt) {
    return Experience.softDeleteById(id, deletedAt).lean();
  },

  restoreById(id, data) {
    return Experience.restoreById(id, data).lean();
  },

  // Solo para deshacer un alta que no ha llegado a usarse (su referencia se eliminó a la vez)
  deleteCreatedById(id) {
    return Experience.deleteOne({ _id: id });
  },
};
