/**
 * Caché en memoria con caducidad, para no repetir lo que cuesta dinero (la IA) o tiempo (el
 * tiempo, OpenStreetMap). No hay base de datos: si el servidor se reinicia, se vacía y ya está.
 *
 * wrap(key, load) devuelve lo guardado o lo calcula. Si llegan dos peticiones iguales a la vez, la
 * segunda espera a la primera en vez de calcularlo otra vez (con la IA, eso es pagar dos veces).
 * Un fallo no se guarda: la siguiente petición lo vuelve a intentar.
 *
 * Con max entradas como mucho: al pasarse se borra la más antigua (Map guarda el orden).
 */
export function createCache({ ttlMs, max = 500, now = Date.now } = {}) {
  const entries = new Map();
  const pending = new Map();

  function get(key) {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function set(key, value) {
    entries.delete(key);
    entries.set(key, { value, expiresAt: now() + ttlMs });
    while (entries.size > max) entries.delete(entries.keys().next().value);
  }

  async function wrap(key, load) {
    const cached = get(key);
    if (cached !== undefined) return cached;
    if (pending.has(key)) return pending.get(key);

    const promise = (async () => {
      try {
        const value = await load();
        set(key, value);
        return value;
      } finally {
        pending.delete(key);
      }
    })();
    pending.set(key, promise);
    return promise;
  }

  return { get, set, wrap, get size() { return entries.size; }, clear: () => entries.clear() };
}
