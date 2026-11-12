// Entorno de producción. `ng serve` lo sustituye por environment.development.ts.
// La web reenvía /api a la API desde el mismo origen, como el panel.
export const environment = {
  production: true,
  /** URL base de la API, sin barra final. La web pública solo usa /api/shop. */
  apiUrl: '/api',
  /** Tiempo máximo de espera de una petición, en milisegundos. */
  apiTimeout: 10_000,
};
