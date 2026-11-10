import { z } from "zod";
import { queryNumber } from "../utils/listQuery.js";
import { FACETS_LIMIT, experienceListQuery } from "./experience.schema.js";

// Query params de /api/shop (routes/shop.routes.js): la tienda pública, para el Home, el Shop y
// el detalle de una experiencia. Los filtros por relación van por slug, no por id: así el enlace
// del Home al Shop se lee (?category=montana-b8c930).

/** Tamaño de página del Shop. */
export const SHOP_LIMIT = Object.freeze({ default: 12, max: 50 });

/** Los órdenes del Shop. Sin sort, las más recientes. */
export const SHOP_SORT = Object.freeze(["title", "priceFrom", "nextDepartureAt", "createdAt"]);
export const SHOP_DEFAULT_SORT = "-createdAt";

const slug = z
  .string()
  .trim()
  .max(200)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: "must be a slug: lowercase letters, numbers and hyphens" });

const sortField = `(${SHOP_SORT.join("|")})`;
const sortPattern = new RegExp(`^-?${sortField}(,-?${sortField})*$`);

// Los de las experiencias, con su mismo esquema (schemas/experience.schema.js)
const { difficulty, language, priceMin, priceMax, from, to, hasDepartures } = experienceListQuery.filters;

/** GET /api/shop/categories, /hosts y /locations: cuántos trae cada carrusel. */
export const shopCarouselQuery = z.strictObject({
  limit: queryNumber.pipe(z.number().int().min(1).max(FACETS_LIMIT.max)).optional(),
});

/** GET /api/shop/experiences. */
export const shopExperiencesQuery = z
  .strictObject({
    category: slug.optional(),
    host: slug.optional(),
    location: slug.optional(),
    // Un trozo del título, sin distinguir mayúsculas. Vacío, sin buscar
    search: z.string().trim().max(100).optional(),
    difficulty: difficulty.optional(),
    language: language.optional(),
    priceMin: priceMin.optional(),
    priceMax: priceMax.optional(),
    from: from.optional(),
    to: to.optional(),
    hasDepartures: hasDepartures.optional(),
    sort: z
      .string()
      .refine((value) => sortPattern.test(value), {
        message: `sort must be a comma-separated list of: ${SHOP_SORT.join(", ")}`,
      })
      .optional(),
    page: queryNumber.pipe(z.number().int().min(1)).optional(),
    limit: queryNumber.pipe(z.number().int().min(1).max(SHOP_LIMIT.max)).optional(),
  })
  .refine((query) => query.priceMin === undefined || query.priceMax === undefined || query.priceMin <= query.priceMax, {
    message: "priceMax must be greater than or equal to priceMin",
    path: ["priceMax"],
  })
  .refine((query) => query.from === undefined || query.to === undefined || query.from <= query.to, {
    message: "to must be greater than or equal to from",
    path: ["to"],
  });
