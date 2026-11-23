import { createProxyMiddleware } from "http-proxy-middleware";
import { sendError } from "../middlewares/errorHandler.js";

/** Si la ruta es la del prefijo o cuelga de él: /api y /api/... sí; /apix no. */
export const matchesPrefix = (pathname, prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * El proxy de un servicio: reenvía la petición tal cual (método, ruta con su query, cabeceras y
 * cuerpo en streaming) y devuelve la respuesta tal cual, sin leerla ni comprimirla. Así:
 * - el Set-Cookie de auth llega intacto al navegador (mismo Path, sin Domain);
 * - el chat de la IA (SSE) llega evento a evento, sin buffer;
 * - Cookie y Authorization pasan sin cambios: la API las vuelve a comprobar.
 *
 * El Host se conserva (changeOrigin false) y xfwd añade X-Forwarded-For, -Proto, -Host y -Port,
 * después de que cleanHeaders haya borrado los que mandó el cliente.
 *
 * Si el servicio no contesta en timeoutMs (sin recibir nada), 504; si está caído, 502. Ojo: el
 * plazo es de inactividad, así que un streaming que sigue mandando eventos no caduca.
 */
export function serviceProxy({ name, prefix, target, timeoutMs }) {
  return createProxyMiddleware({
    target,
    pathFilter: (pathname) => matchesPrefix(pathname, prefix),
    changeOrigin: false,
    xfwd: true,
    proxyTimeout: timeoutMs,
    on: {
      proxyReq(proxyReq, req) {
        req.service = name;
        proxyReq.on("timeout", () => {
          req.upstreamTimedOut = true;
        });
      },
      error(err, req, res) {
        // Un WebSocket (en la fase de los frontales): no hay respuesta HTTP que mandar
        if (!res || typeof res.setHeader !== "function") return res?.destroy?.();
        req.service ??= name;
        if (req.upstreamTimedOut) {
          console.warn(`[${name}] no answer in ${timeoutMs} ms: ${req.method} ${req.path ?? req.url}`);
          return sendError(res, 504, `The ${name} service took too long to answer`);
        }
        console.warn(`[${name}] ${err.code ?? err.message}: ${req.method} ${req.path ?? req.url}`);
        sendError(res, 502, `The ${name} service is not available`);
      },
    },
  });
}
