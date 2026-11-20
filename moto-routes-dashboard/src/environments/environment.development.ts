// Entorno de desarrollo (`ng serve`).
// La API va por el proxy de `ng serve` (proxy.conf.json → http://localhost:3000, el PORT de
// moto-routes-api/.env.example): el panel llama a /api desde su propio origen, así la cookie
// de sesión viaja sin credenciales cruzadas entre puertos. El servicio de auth, igual: /auth va
// a http://localhost:3002, así las dos cookies (sesión y refresh) son del mismo origen.
export const environment = {
  production: false,
  /** URL base de la API, sin barra final. */
  apiUrl: '/api',
  /** URL base del servicio de auth (login, refresh, logout, contraseña), sin barra final. */
  authUrl: '/auth',
  /** Tiempo máximo de espera de una petición, en milisegundos. */
  apiTimeout: 10_000,
};
