// Entorno de producción. `ng serve` lo sustituye por environment.development.ts.
// Pensado para el montaje recomendado: la misma web sirve el panel y reenvía /api a la API
// (ver "Producción con HTTPS" en el README de la API). Si la API va en otro origen, aquí su
// URL completa, y ese origen del panel en el CORS_ORIGIN de la API para que viaje la cookie.
export const environment = {
  production: true,
  /** URL base de la API, sin barra final. */
  apiUrl: '/api',
  /** Tiempo máximo de espera de una petición, en milisegundos. */
  apiTimeout: 10_000,
};
