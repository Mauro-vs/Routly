// Entorno de desarrollo (`ng serve`): /api llega a la API por proxy.conf.json.
export const environment = {
  production: false,
  apiUrl: '/api',
  apiTimeout: 10_000,
  // /ai llega al servidor de IA (moto-routes-ai, puerto 3001) por proxy.conf.json
  aiUrl: '/ai',
  aiTimeout: 75_000,
  // /auth llega al servicio de auth (moto-routes-auth, puerto 3002) por proxy.conf.json
  authUrl: '/auth',
};
