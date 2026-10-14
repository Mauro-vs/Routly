export function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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
