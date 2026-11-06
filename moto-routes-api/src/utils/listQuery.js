import { z } from "zod";

/*
 * Query params de los listados (GET /api/<colección>). Todos son opcionales y se combinan:
 *
 *   q        busca palabras en los campos de texto de la colección (índice de texto, $text)
 *   status   active | inactive
 *   sort     campos separados por comas; un "-" delante es descendente: -distance,title
 *   page     número de página, desde 1. Sin page se devuelve todo, como siempre
 *   limit    tamaño de la página, de 1 a 100 (20 por defecto)
 *
 * y los filtros propios de cada colección (difficulty, categoryId, distanceMin...), que
 * declara su esquema con defineListQuery. Un parámetro que no está declarado es un 400, igual
 * que un campo de más en el body.
 *
 * La respuesta sigue siendo un array. Con page, el total va en las cabeceras X-Total-Count,
 * X-Page y X-Limit (sendList).
 */

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const LIST_HEADERS = ["X-Total-Count", "X-Page", "X-Limit"];

// En la URL todo llega como texto: estos esquemas lo convierten al tipo de verdad
export const queryNumber = z.coerce.number();
export const queryBoolean = z.enum(["true", "false"]).transform((value) => value === "true");
export const queryDate = z.iso.datetime({ offset: true }).or(z.iso.date()).transform((value) => new Date(value));

/**
 * Define los query params de un listado.
 *
 * @param options.sort     campos por los que se puede ordenar
 * @param options.filters  { nombre: { schema, to } }: el esquema de Zod del valor (ya
 *                         convertido) y cómo se traduce a un trozo del filtro de MongoDB
 * @param options.ranges   pares [mínimo, máximo] que no pueden cruzarse: 400 en el máximo
 * @param options.checks   otras reglas entre parámetros: [comprobación, { message, path }]
 * @returns { schema, build, sortable, filters, ranges } schema para validate({ query }), build(query,
 *          base) para el service, y el resto para la documentación
 */
export function defineListQuery({ sort: sortable, filters = {}, ranges = [], checks = [] }) {
  const field = `(${sortable.join("|")})`;
  const sortPattern = new RegExp(`^-?${field}(,-?${field})*$`);

  let schema = z.strictObject({
    q: z.string().trim().min(1).max(100).optional(),
    status: z.enum(["active", "inactive"]).optional(),
    // refine y no regex: así el error dice qué campos valen, no solo "has an invalid format"
    sort: z
      .string()
      .refine((value) => sortPattern.test(value), {
        message: `sort must be a comma-separated list of: ${sortable.join(", ")}`,
      })
      .optional(),
    page: queryNumber.pipe(z.number().int().min(1)).optional(),
    limit: queryNumber.pipe(z.number().int().min(1).max(MAX_LIMIT)).optional(),
    ...Object.fromEntries(Object.entries(filters).map(([name, filter]) => [name, filter.schema.optional()])),
  });

  for (const [min, max] of ranges) {
    schema = schema.refine((query) => query[min] === undefined || query[max] === undefined || query[min] <= query[max], {
      message: `${max} must be greater than or equal to ${min}`,
      path: [max],
    });
  }
  for (const [check, issue] of checks) schema = schema.refine(check, issue);

  /**
   * La consulta de MongoDB de unos query params ya validados.
   *
   * @param base el filtro que siempre se aplica (el alcance público de services/visibility.js)
   * @returns { filter, sort, page, limit } sort es undefined si no se pide: el repositorio usa
   *          su orden de siempre. page también, si no se pide: se devuelve todo.
   */
  function build(query = {}, base = {}) {
    const clauses = [];
    if (Object.keys(base).length > 0) clauses.push(base);
    if (query.status) clauses.push({ isActive: query.status === "active" });
    for (const [name, filter] of Object.entries(filters)) {
      if (query[name] !== undefined) clauses.push(filter.to(query[name]));
    }

    const filter = clauses.length === 0 ? {} : clauses.length === 1 ? { ...clauses[0] } : { $and: clauses };
    // $text va en la raíz del filtro: MongoDB no lo admite dentro de $nor
    if (query.q) filter.$text = { $search: query.q };

    const page = query.page ?? (query.limit !== undefined ? 1 : undefined);
    return {
      filter,
      sort: query.sort ? parseSort(query.sort) : undefined,
      page,
      limit: page === undefined ? undefined : (query.limit ?? DEFAULT_LIMIT),
    };
  }

  // sortable, filters y ranges: para documentar cada listado en Swagger (docs/openapi.js)
  const filterSchemas = Object.fromEntries(Object.entries(filters).map(([name, filter]) => [name, filter.schema]));
  return { schema, build, sortable, filters: filterSchemas, ranges };
}

/** "-distance,title" → { distance: -1, title: 1 }. */
export function parseSort(sort) {
  return Object.fromEntries(
    sort.split(",").map((part) => (part.startsWith("-") ? [part.slice(1), -1] : [part, 1])),
  );
}

/**
 * Ejecuta la consulta de build() con un repositorio (findAll y count). Con page, trae solo esa
 * página y cuenta el total; sin page, todo. Con un orden pedido, el _id desempata, para que una
 * página no repita ni se salte documentos con el mismo valor.
 *
 * @returns { items, total?, page?, limit? }
 */
export async function findList(repository, { filter, sort, page, limit }) {
  const order = sort && { ...sort, _id: 1 };
  if (page === undefined) return { items: await repository.findAll(filter, { sort: order }) };

  const [items, total] = await Promise.all([
    repository.findAll(filter, { sort: order, skip: (page - 1) * limit, limit }),
    repository.count(filter),
  ]);
  return { items, total, page, limit };
}

/** Responde un listado: el array y, si es una página, sus cabeceras. */
export function sendList(res, { items, total, page, limit }) {
  if (page !== undefined) {
    res.set({ "X-Total-Count": String(total), "X-Page": String(page), "X-Limit": String(limit) });
  }
  res.json(items);
}

/** Un rango (distanceMin/distanceMax) sobre un mismo campo: { distance: { $gte } } o { $lte }. */
export const atLeast = (field) => (value) => ({ [field]: { $gte: value } });
export const atMost = (field) => (value) => ({ [field]: { $lte: value } });
export const equals = (field) => (value) => ({ [field]: value });
