/*
 * Opciones del índice de texto de cada colección: el que usa ?q= en los listados
 * (utils/listQuery.js). Solo puede haber uno por colección.
 *
 * - default_language "spanish": "rutas" encuentra "ruta", y "de", "la"... no cuentan.
 * - language_override: MongoDB toma por defecto el campo "language" como el idioma de cada
 *   documento, y las experiencias tienen uno (es, en, ca, eu, gl...) con valores que no admite.
 *   Se apunta a un campo que no existe para que todos se indexen en español.
 */
export const TEXT_INDEX = Object.freeze({
  name: "text_search",
  default_language: "spanish",
  language_override: "textSearchLanguage",
});
