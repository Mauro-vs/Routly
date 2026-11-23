/*
 * La gateway es el borde: lo que diga el cliente sobre su IP, su protocolo o quién es no vale.
 *
 * - Las cabeceras de proxy (X-Forwarded-*, Forwarded, X-Real-IP) se borran y el proxy pone las
 *   suyas (xfwd). Si no, cualquiera podría inventarse su IP y saltarse el límite de intentos de auth.
 * - Las de identidad (X-User-*, X-Auth-*...) también: la gateway nunca dice a los servicios quién
 *   es el usuario (la API lo comprueba con el token), y nadie puede colarlas desde fuera.
 */
const PROXY_HEADERS = new Set(["forwarded", "x-real-ip", "x-client-ip", "true-client-ip"]);
const IDENTITY = /^x-(user|auth|authenticated|remote-user|forwarded-user)(-|$)/;

/** Borra esas cabeceras de una petición (también de un WebSocket, que no pasa por Express). */
export function stripUntrustedHeaders(req) {
  for (const name of Object.keys(req.headers)) {
    if (name.startsWith("x-forwarded-") || PROXY_HEADERS.has(name) || IDENTITY.test(name)) {
      delete req.headers[name];
    }
  }
}

export function cleanHeaders(req, res, next) {
  stripUntrustedHeaders(req);
  next();
}
