// Entorno de desarrollo (`ng serve`): /api llega a la API por proxy.conf.json.
export const environment = {
  production: false,
  apiUrl: '/api',
  apiTimeout: 10_000,
  // /ai llega al servidor de IA (moto-routes-ai, puerto 3001) por proxy.conf.json
  aiUrl: '/ai',
  aiTimeout: 45_000,
};
