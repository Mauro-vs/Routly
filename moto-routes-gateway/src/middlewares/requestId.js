import { randomUUID } from "node:crypto";

// Un UUID (cualquier versión). Lo que no lo sea se cambia: no se registra texto libre del cliente
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * X-Request-Id: el mismo identificador en el registro de la gateway, en la petición que llega al
 * servicio y en la respuesta al navegador. Si el cliente manda uno válido se respeta (para seguir
 * una petición de punta a punta); si no, se crea.
 */
export function requestId(req, res, next) {
  const incoming = req.headers["x-request-id"];
  const id = typeof incoming === "string" && UUID.test(incoming) ? incoming.toLowerCase() : randomUUID();
  req.id = id;
  req.headers["x-request-id"] = id;
  res.setHeader("x-request-id", id);
  next();
}
