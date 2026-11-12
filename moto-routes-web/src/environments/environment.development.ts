// Entorno de desarrollo (`ng serve`): /api llega a la API por proxy.conf.json.
export const environment = {
  production: false,
  apiUrl: '/api',
  apiTimeout: 10_000,
};
