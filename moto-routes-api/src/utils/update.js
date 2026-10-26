/**
 * Convierte los datos de un PATCH en la actualización de Mongoose. Un null significa
 * "vaciar el campo" (lo permiten los esquemas con clearable()): va a $unset y el
 * campo desaparece del documento en vez de guardarse como null.
 *
 * Sin nulls devuelve los datos tal cual, como hasta ahora.
 */
export function toUpdate(data) {
  const cleared = Object.keys(data).filter((key) => data[key] === null);
  if (cleared.length === 0) return data;

  const $set = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== null));
  return { $set, $unset: Object.fromEntries(cleared.map((key) => [key, ""])) };
}
