// Entorno de producción. `ng serve` lo sustituye por environment.development.ts.
// El puerto sale de moto-routes-api/.env.example (PORT=3000). Si el panel se sirve desde
// otro origen, ese origen tiene que estar en el CORS_ORIGIN de la API para que viaje la cookie.
export const environment = {
  production: true,
  /** URL base de la API, sin barra final. */
  apiUrl: 'http://localhost:3000/api',
  /** Tiempo máximo de espera de una petición, en milisegundos. */
  apiTimeout: 10_000,
};
