// Igual que moto-routes-api/src/utils/slugify.js: el slug de un usuario creado aquí tiene que
// ser como los que crea la API ("ana-garcia-1a2b3c")
export function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildSlug(text, id) {
  const base = slugify(text) || "item";
  return `${base}-${String(id).slice(-6)}`;
}
