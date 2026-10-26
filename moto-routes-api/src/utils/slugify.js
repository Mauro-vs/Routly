export function slugify(text) {
  return String(text)
    // NFD separa la letra de su tilde ("á" → "a" + "´") y luego se quita la tilde
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// El sufijo del _id hace que dos rutas con el mismo título tengan slugs distintos.
// La garantía real de unicidad es el índice único de `slug` en el modelo.
export function buildSlug(text, id) {
  const base = slugify(text) || "item";
  return `${base}-${String(id).slice(-6)}`;
}
