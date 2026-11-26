import mongoose from "mongoose";

/*
 * La nota media que se guarda en las experiencias, los anfitriones y las rutas, calculada con las
 * opiniones visibles (services/rating.service.js). Nunca llega del cliente: la recalcula la API con
 * una agregación cada vez que cambia una opinión, así que no se puede desincronizar.
 *
 *   average       media de 1 a 5 con dos decimales (0 si no hay ninguna)
 *   count         cuántas opiniones
 *   distribution  cuántas de cada nota: { "1": 0, "2": 1, "3": 0, "4": 3, "5": 8 }
 */

export const RATING_VALUES = Object.freeze([1, 2, 3, 4, 5]);

/** Una nota vacía: sin opiniones. Función, para que cada documento tenga su propio objeto. */
export const emptyRating = () => ({
  average: 0,
  count: 0,
  distribution: Object.fromEntries(RATING_VALUES.map((value) => [String(value), 0])),
});

export const ratingSchema = new mongoose.Schema(
  {
    average: { type: Number, min: 0, max: 5, default: 0 },
    count: { type: Number, min: 0, default: 0 },
    // Mixed: las claves son "1" a "5" y siempre se escribe entera
    distribution: { type: mongoose.Schema.Types.Mixed, default: () => emptyRating().distribution },
  },
  { _id: false }
);

/** El campo de un modelo: la nota, vacía por defecto. */
export const ratingField = () => ({ type: ratingSchema, default: emptyRating });
