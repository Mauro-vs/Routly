import { STATUS_CODES } from "node:http";
import { ZodError } from "zod";
import { createError } from "../utils/errors.js";

// El mismo formato de error que la API: { statusCode, error, message, details? }. Así la web trata
// igual un fallo de /api y uno de /ai.

export function notFoundHandler(req, res, next) {
  next(createError(`Endpoint ${req.method} ${req.originalUrl} not found`, 404));
}

// Un issue de Zod como { field, message }, sin devolver nunca lo que llegó
function zodDetail(issue) {
  const field = issue.path.join(".") || "body";
  if (issue.code === "unrecognized_keys") return { field, message: `${issue.keys.join(", ")} is not allowed` };
  if (issue.code === "custom") return { field, message: issue.message };
  return { field, message: `${field} is invalid: ${issue.message}` };
}

function normalizeError(err) {
  if (err instanceof ZodError) {
    return { statusCode: 400, message: "Validation failed", details: err.issues.map(zodDetail) };
  }
  if (err?.type === "entity.too.large") {
    return { statusCode: 413, message: `Request body is larger than ${err.limit} bytes` };
  }
  if (err?.type === "entity.parse.failed") {
    return { statusCode: 400, message: "Malformed JSON in request body" };
  }
  // Los propios (utils/errors.js): 4xx, y 502/503/504 cuando falla un servicio del que dependemos
  if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 && err.status !== 500) {
    return { statusCode: err.status, message: err.message, details: err.details };
  }
  return { statusCode: 500, message: "Internal server error" };
}

export function errorHandler(err, req, res, next) {
  const { statusCode, message, details } = normalizeError(err);

  // La traza solo en el servidor. De un servicio caído basta una línea (no es un fallo nuestro)
  if (statusCode === 500) console.error(err);
  else if (statusCode >= 502) console.warn(`[${err.service ?? "upstream"}] ${message}${err.upstreamStatus ? ` (HTTP ${err.upstreamStatus})` : ""}`);

  // Si ya se estaba mandando (el streaming del chat), no se puede cambiar la respuesta
  if (res.headersSent) return res.end();

  res.status(statusCode).json({
    statusCode,
    error: STATUS_CODES[statusCode],
    message,
    ...(details && { details }),
  });
}
