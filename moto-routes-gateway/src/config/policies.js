/*
 * Qué rutas exigen sesión en la puerta. Sale de las rutas reales de la API y de auth (y un test,
 * policies.test.js, las lee y falla si alguna no encaja): si cambian allí, hay que cambiarlo aquí.
 *
 * La gateway solo mira si el token es auténtico. El rol, la propiedad del recurso, la lista negra
 * y el tokenVersion los sigue comprobando la API: un rider que pide /api/users pasa la puerta y la
 * API le responde 403.
 *
 * Lo que no está aquí es público: los GET de /api (incluidos /api/shop y /api/docs, salvo "mi
 * opinión"), el login, el registro, el refresh y el logout de auth, su JWKS, la IA (salvo
 * /ai/admin) y los /health.
 */

const WRITE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const READ = new Set(["GET", "HEAD"]);

export const POLICIES = Object.freeze([
  // Cualquier cambio en la API: crear, editar, activar, borrar, restaurar...
  { name: "api writes", methods: WRITE, path: /^\/api(\/|$)/ },
  // Colecciones privadas enteras: usuarios y roles (solo admin) y el perfil (el propio usuario)
  { name: "api private collections", path: /^\/api\/(users|roles|profile)(\/|$)/ },
  // Las papeleras y los inactivos de cada colección (solo admin)
  { name: "api inactives and trash", methods: READ, path: /^\/api\/[^/]+\/(inactives|deleted)\/?$/ },
  // Las opiniones: leerlas todas es del panel (solo admin); las públicas van por /api/shop
  { name: "api reviews", methods: READ, path: /^\/api\/reviews(\/|$)/ },
  // Mi opinión de una experiencia o un anfitrión, para el formulario de la tienda
  { name: "api my review", methods: READ, path: /^\/api\/shop\/(experiences|hosts)\/[^/]+\/reviews\/mine\/?$/ },
  // La IA del panel (la salud del producto): solo admin, lo comprueba la API
  { name: "ai admin", path: /^\/ai\/admin(\/|$)/ },
  // Auth: lo que necesita saber quién eres
  { name: "auth me", methods: READ, path: /^\/auth\/me\/?$/ },
  { name: "auth logout all", methods: new Set(["POST"]), path: /^\/auth\/logout-all\/?$/ },
  { name: "auth password", methods: new Set(["PATCH"]), path: /^\/auth\/password\/?$/ },
]);

/** Normaliza la ruta como la ve Express: sin query, decodificada y en minúsculas (no distingue). */
function normalize(pathname) {
  let path = pathname.split("?")[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    // Mal codificada: se compara tal cual (la API la rechazará)
  }
  return path.toLowerCase();
}

/** Si esa petición necesita una sesión válida para pasar la puerta. Un OPTIONS (CORS) nunca. */
export function requiresSession(method, pathname) {
  if (method === "OPTIONS") return false;
  const path = normalize(pathname);
  return POLICIES.some((policy) => (!policy.methods || policy.methods.has(method)) && policy.path.test(path));
}
