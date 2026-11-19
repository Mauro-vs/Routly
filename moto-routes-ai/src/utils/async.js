/**
 * Lo que llegue antes de ms; si no llega a tiempo o falla, null. No corta la petición: sigue en
 * marcha y, si va por una caché, la siguiente vez ya está.
 */
export function within(promise, ms) {
  let timer;
  const late = new Promise((resolve) => {
    timer = setTimeout(resolve, ms, null);
    timer.unref?.();
  });
  return Promise.race([promise.catch(() => null), late]).finally(() => clearTimeout(timer));
}
