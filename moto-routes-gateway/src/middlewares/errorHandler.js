import { STATUS_CODES } from "node:http";
import { createError } from "../utils/errors.js";

/*
 * El mismo formato de error que la API, auth y la IA: { statusCode, error, message, code? }. Así
 * los frontales tratan igual un error de la gateway que uno de un servicio (y, en la fase del
 * token, el code TOKEN_EXPIRED o TOKEN_INVALID que esperan sus interceptores).
 */

/** Manda un error con el formato común. Sirve también fuera de Express (el proxy). */
export function sendError(res, statusCode, message, extra = {}) {
  if (res.headersSent) return res.end();
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ statusCode, error: STATUS_CODES[statusCode], message, ...extra }));
}

export function notFoundHandler(req, res, next) {
  next(createError(`Endpoint ${req.method} ${req.path} not found`, 404));
}

export function errorHandler(err, req, res, next) {
  const known = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 && err.status !== 500;
  if (!known) console.error(err);
  const statusCode = known ? err.status : 500;
  const message = known ? err.message : "Internal server error";
  sendError(res, statusCode, message, err?.code && known ? { code: err.code } : {});
}
