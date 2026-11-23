/**
 * El registro de acceso: una línea JSON por petición, cuando termina (o el cliente corta).
 *
 * Lleva la ruta sin la query (puede llevar datos personales: una búsqueda, un correo) y nunca las
 * cabeceras Cookie, Authorization ni Set-Cookie, ni los cuerpos. `service` es el servicio al que se
 * mandó (null si la contestó la propia gateway).
 */
export function accessLog(write = (line) => console.log(line), now = () => performance.now()) {
  return (req, res, next) => {
    const start = now();
    let logged = false;
    const log = () => {
      if (logged) return;
      logged = true;
      write(
        JSON.stringify({
          time: new Date().toISOString(),
          requestId: req.id,
          method: req.method,
          path: req.originalUrl.split("?")[0],
          service: req.service ?? null,
          status: res.headersSent ? res.statusCode : null,
          ms: Math.round(now() - start),
          ...(req.blockedBy && { blockedBy: req.blockedBy }),
        }),
      );
    };
    res.on("finish", log);
    res.on("close", log);
    next();
  };
}
