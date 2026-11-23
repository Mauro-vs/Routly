import { createError } from "../utils/errors.js";

/**
 * Corta en la puerta un cuerpo demasiado grande, por su Content-Length (413). La gateway no lee
 * los cuerpos: los reenvía tal cual. Cada servicio sigue teniendo su propio límite (50 kB la API).
 */
export function bodyLimit(maxBytes) {
  return (req, res, next) => {
    const length = Number(req.headers["content-length"]);
    if (Number.isFinite(length) && length > maxBytes) {
      return next(createError(`Request body is larger than ${maxBytes} bytes`, 413));
    }
    next();
  };
}
