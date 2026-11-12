import { Departure } from "../models/departure.model.js";
import { Experience } from "../models/experience.model.js";
import { Route } from "../models/route.model.js";
import { toUpdate } from "../utils/update.js";
import { reservable } from "./departure.repository.js";

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

// Los datos que no son de la experiencia sino de sus salidas reservables (sort=priceFrom o
// nextDepartureAt): los calcula la agregación de findPageByComputedSort
export const COMPUTED_SORT = Object.freeze(["priceFrom", "nextDepartureAt"]);

// El campo auxiliar que manda al final las que no tienen el dato (sin salidas reservables)
const missingKey = (field) => `_missing_${field}`;

// El $match de una agregación, sin los eliminados. aggregate no convierte tipos como find: un id
// que llega como texto (?hostId=) no encontraría nada sin pasarlo antes por el esquema
const matchStage = (filter) => ({ $match: Experience.find().cast(Experience, { ...filter, deletedAt: null }) });

export const experienceRepository = {
  findAll(filter = {}, { sort = { createdAt: -1 }, skip = 0, limit = 0 } = {}) {
    return withRelations(
      Experience.find(filter).sort(sort).skip(skip).limit(limit)
    ).lean();
  },

  /**
   * Una página ordenada por un dato de sus salidas (el precio "desde", la próxima fecha), toda
   * en MongoDB: cada experiencia se cruza con sus salidas reservables ($lookup por el índice
   * experienceId + state + startAt), se ordena y se corta la página. A Node solo llegan los _id
   * de la página y el total. Las que no tienen el dato van siempre al final, se ordene como se
   * ordene; si todo empata, el _id.
   *
   * Una agregación no pasa por el plugin de soft delete: deletedAt se filtra a mano, aquí y en
   * las salidas. Los títulos se comparan en español (collation), salvo con $text, que no la admite.
   *
   * @param sort { campo: 1 | -1 } ya traducido (utils/listQuery.js)
   * @returns { ids, total } total solo con page
   */
  async findPageByComputedSort({ filter = {}, sort, page, limit }, now = new Date()) {
    const computed = Object.keys(sort).filter((field) => COMPUTED_SORT.includes(field));
    const order = {};
    for (const [field, direction] of Object.entries(sort)) {
      if (computed.includes(field)) order[missingKey(field)] = 1;
      order[field] = direction;
    }
    order._id = 1;

    const pipeline = [
      matchStage(filter),
      {
        $lookup: {
          from: Departure.collection.name,
          localField: "_id",
          foreignField: "experienceId",
          pipeline: [
            { $match: { deletedAt: null, ...reservable(now) } },
            { $group: { _id: null, priceFrom: { $min: "$price" }, nextDepartureAt: { $min: "$startAt" } } },
          ],
          as: "summary",
        },
      },
      {
        $set: {
          priceFrom: { $first: "$summary.priceFrom" },
          nextDepartureAt: { $first: "$summary.nextDepartureAt" },
        },
      },
      {
        $set: Object.fromEntries(
          computed.map((field) => [missingKey(field), { $cond: [{ $eq: [{ $ifNull: [`$${field}`, null] }, null] }, 1, 0] }]),
        ),
      },
      { $sort: order },
    ];

    const ids = { $project: { _id: 1 } };
    pipeline.push(
      page === undefined
        ? ids
        : { $facet: { ids: [{ $skip: (page - 1) * limit }, { $limit: limit }, ids], total: [{ $count: "count" }] } },
    );

    const aggregation = Experience.aggregate(pipeline);
    if (!filter.$text) aggregation.collation({ locale: "es" });
    const result = await aggregation;
    if (page === undefined) return { ids: result.map((row) => row._id) };
    const [{ ids: rows, total }] = result;
    return { ids: rows.map((row) => row._id), total: total[0]?.count ?? 0 };
  },

  /**
   * Las facetas del Home: de las experiencias que cumplen el filtro, cuántas tiene cada anfitrión,
   * cada categoría y cada ubicación (las de su ruta; una ruta que empieza y acaba en el mismo
   * sitio cuenta una vez). Todo con $group en MongoDB: a Node solo llegan los recuentos.
   *
   * @param kinds las listas que se piden: "hosts", "categories", "locations"
   * @returns { hosts: [{ _id, count }], categories: [...], locations: [...] } solo las pedidas
   */
  async countFacets(filter = {}, kinds = ["categories", "hosts", "locations"]) {
    const count = (key) => [{ $group: { _id: key, count: { $sum: 1 } } }];
    const facets = {
      hosts: count("$hostId"),
      categories: [{ $match: { "route.categoryId": { $exists: true } } }, ...count("$route.categoryId")],
      locations: [
        { $match: { route: { $ne: null } } },
        { $project: { locationIds: { $setUnion: [["$route.startLocationId", "$route.endLocationId"]] } } },
        { $unwind: "$locationIds" },
        ...count("$locationIds"),
      ],
    };

    const [result] = await Experience.aggregate([
      matchStage(filter),
      { $project: { hostId: 1, routeId: 1 } },
      ...(kinds.some((kind) => kind !== "hosts")
        ? [
            {
              $lookup: {
                from: Route.collection.name,
                localField: "routeId",
                foreignField: "_id",
                pipeline: [
                  { $match: { deletedAt: null } },
                  { $project: { categoryId: 1, startLocationId: 1, endLocationId: 1 } },
                ],
                as: "route",
              },
            },
            { $set: { route: { $first: "$route" } } },
          ]
        : []),
      { $facet: Object.fromEntries(kinds.map((kind) => [kind, facets[kind]])) },
    ]);
    return result;
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

  // Sin las relaciones: para comprobar que existe y es visible (las salidas de la tienda)
  findPlainBySlug(slug) {
    return Experience.findOne({ slug }).lean();
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
