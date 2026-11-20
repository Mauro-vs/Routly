import { STATUS_CODES } from "node:http";
import { ZodError } from "zod";
import { createError } from "../utils/errors.js";

// El mismo formato de error que la API y la IA: { statusCode, error, message, code?, details? }

export function notFoundHandler(req, res, next) {
  next(createError(`Endpoint ${req.method} ${req.originalUrl} not found`, 404));
}

function zodDetail(issue) {
  const field = issue.path.join(".") || "body";
  if (issue.code === "unrecognized_keys") return issue.keys.map((key) => ({ field: key, message: `${key} is not allowed` }));
  if (issue.code === "custom") return [{ field, message: issue.message }];
  if (issue.input === undefined) return [{ field, message: `${field} is required` }];

  const isString = issue.origin === "string";
  let rule;
  switch (issue.code) {
    case "invalid_type":
      rule = `must be a valid ${issue.expected}`;
      break;
    case "too_small":
      rule = isString
        ? issue.minimum === 1
          ? "cannot be empty"
          : `must be at least ${issue.minimum} characters`
        : `must be greater than or equal to ${issue.minimum}`;
      break;
    case "too_big":
      rule = isString ? `must be at most ${issue.maximum} characters` : `must be less than or equal to ${issue.maximum}`;
      break;
    case "invalid_format":
      rule = "has an invalid format";
      break;
    default:
      rule = "is invalid";
  }
  return [{ field, message: `${field} ${rule}` }];
}

function normalizeError(err) {
  if (err instanceof ZodError) {
    return { statusCode: 400, message: "Validation failed", details: err.issues.flatMap(zodDetail) };
  }
  // Dos registros a la vez con el mismo correo: el índice único de la API para el segundo
  if (err?.code === 11000) return { statusCode: 409, message: "A user with this email already exists" };
  if (err?.type === "entity.too.large") return { statusCode: 413, message: `Request body is larger than ${err.limit} bytes` };
  if (err?.type === "entity.parse.failed") return { statusCode: 400, message: "Malformed JSON in request body" };

  if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500) {
    const code = err.status === 401 && typeof err.code === "string" ? err.code : undefined;
    return { statusCode: err.status, message: err.message, details: err.details, code };
  }
  return { statusCode: 500, message: "Internal server error" };
}

export function errorHandler(err, req, res, next) {
  const { statusCode, message, details, code } = normalizeError(err);

  // La traza solo en el servidor, nunca en la respuesta
  if (statusCode >= 500) console.error(err);

  // RFC 6750: un 401 dice cómo autenticarse; si había token pero no sirve, lo indica
  if (statusCode === 401) res.set("WWW-Authenticate", code ? 'Bearer error="invalid_token"' : "Bearer");

  res.status(statusCode).json({
    statusCode,
    error: STATUS_CODES[statusCode],
    message,
    ...(code && { code }),
    ...(details && { details }),
  });
}
