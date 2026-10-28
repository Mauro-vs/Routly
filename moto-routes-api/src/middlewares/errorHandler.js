import { STATUS_CODES } from "node:http";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { createError } from "../utils/errors.js";

export function notFoundHandler(req, res, next) {
  next(createError(`Endpoint ${req.method} ${req.originalUrl} not found`, 404));
}

// Convierte un issue de Zod en uno o varios { field, message }. Nunca se devuelve issue.input.
function zodDetails(issue) {
  // Campos que no están en el esquema (z.strictObject): un detalle por campo
  if (issue.code === "unrecognized_keys") {
    return issue.keys.map((key) => {
      const field = [...issue.path, key].join(".");
      return { field, message: `${field} is not allowed` };
    });
  }
  return [zodDetail(issue)];
}

function zodDetail(issue) {
  const field = issue.path.join(".") || "body";
  const isString = issue.origin === "string";
  let rule;

  // Reglas propias (.refine): su mensaje ya está redactado completo
  if (issue.code === "custom") {
    return { field, message: issue.message };
  }

  if (issue.input === undefined) {
    rule = "is required";
  } else {
    switch (issue.code) {
      case "invalid_type":
        rule = `must be a valid ${issue.expected}`;
        break;
      case "invalid_value":
        rule = `must be one of: ${issue.values.join(", ")}`;
        break;
      // inclusive: false es un límite estricto (.positive(), .gt()): "greater than 0"
      case "too_small":
        if (isString) {
          rule = issue.minimum === 1 ? "cannot be empty" : `must be at least ${issue.minimum} characters`;
        } else {
          rule = `must be greater than ${issue.inclusive === false ? "" : "or equal to "}${issue.minimum}`;
        }
        break;
      case "too_big":
        if (isString) rule = `must be at most ${issue.maximum} characters`;
        else rule = `must be less than ${issue.inclusive === false ? "" : "or equal to "}${issue.maximum}`;
        break;
      case "invalid_format":
        rule = "has an invalid format";
        break;
      default:
        rule = "is invalid";
    }
  }

  return { field, message: `${field} ${rule}` };
}

// Segunda barrera: errores de validación del propio modelo de Mongoose
function mongooseDetail(err) {
  const field = err.path;
  const props = err.properties ?? {};

  if (err instanceof mongoose.Error.CastError) {
    return { field, message: `${field} must be a valid ${err.kind.toLowerCase()}` };
  }

  switch (err.kind) {
    case "required":
      return { field, message: `${field} is required` };
    case "enum":
      return { field, message: `${field} must be one of: ${props.enumValues.join(", ")}` };
    case "min":
      return { field, message: `${field} must be greater than or equal to ${props.min}` };
    case "max":
      return { field, message: `${field} must be less than or equal to ${props.max}` };
    case "maxlength":
      return { field, message: `${field} must be at most ${props.maxlength} characters` };
    // Validadores propios (models/validators.js): su mensaje ya está redactado
    case "user defined":
      return { field, message: err.message };
    default:
      return { field, message: `${field} is invalid` };
  }
}

function normalizeError(err) {
  if (err instanceof ZodError) {
    return {
      statusCode: 400,
      message: "Validation failed",
      details: err.issues.flatMap(zodDetails),
    };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: 400,
      message: "Validation failed",
      details: Object.values(err.errors).map(mongooseDetail),
    };
  }

  if (err instanceof mongoose.Error.CastError) {
    return {
      statusCode: 400,
      message: err.kind === "ObjectId" ? "Invalid ID format" : `Invalid value for ${err.path}`,
    };
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? "field";
    return { statusCode: 409, message: `A resource with this ${field} already exists` };
  }

  if (err?.type === "entity.too.large") {
    return { statusCode: 413, message: `Request body is larger than ${err.limit} bytes` };
  }

  if (err?.type === "entity.parse.failed") {
    return { statusCode: 400, message: "Malformed JSON in request body" };
  }

  // Errores propios (utils/errors.js) y errores 4xx de Express/body-parser.
  // fieldError() trae details con el mismo formato que los errores de Zod, y
  // unauthorized() un code (TOKEN_EXPIRED, TOKEN_INVALID) cuando el token no sirve.
  if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500) {
    const code = typeof err.code === "string" ? err.code : undefined;
    return { statusCode: err.status, message: err.message, details: err.details, code };
  }

  return { statusCode: 500, message: "Internal server error" };
}

export function errorHandler(err, req, res, next) {
  const { statusCode, message, details, code } = normalizeError(err);

  // La traza completa solo se ve en el servidor, nunca en la respuesta
  if (statusCode >= 500) console.error(err);

  // RFC 6750: un 401 dice cómo autenticarse; si había token pero no sirve, lo indica
  if (statusCode === 401) {
    res.set("WWW-Authenticate", code ? 'Bearer error="invalid_token"' : "Bearer");
  }

  res.status(statusCode).json({
    statusCode,
    error: STATUS_CODES[statusCode],
    message,
    ...(code && { code }),
    ...(details && { details }),
  });
}
