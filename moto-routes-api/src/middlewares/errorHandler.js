import { STATUS_CODES } from "node:http";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { createError } from "../utils/errors.js";

export function notFoundHandler(req, res, next) {
  next(createError(`Endpoint ${req.method} ${req.originalUrl} not found`, 404));
}

// Convierte un issue de Zod en { field, message }. Nunca se devuelve issue.input.
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
      case "too_small":
        if (!isString) rule = `must be greater than or equal to ${issue.minimum}`;
        else if (issue.minimum === 1) rule = "cannot be empty";
        else rule = `must be at least ${issue.minimum} characters`;
        break;
      case "too_big":
        rule = isString
          ? `must be at most ${issue.maximum} characters`
          : `must be less than or equal to ${issue.maximum}`;
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
      details: err.issues.map(zodDetail),
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

  if (err?.type === "entity.parse.failed") {
    return { statusCode: 400, message: "Malformed JSON in request body" };
  }

  // Errores propios (utils/errors.js) y errores 4xx de Express/body-parser.
  // fieldError() trae details con el mismo formato que los errores de Zod.
  if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500) {
    return { statusCode: err.status, message: err.message, details: err.details };
  }

  return { statusCode: 500, message: "Internal server error" };
}

export function errorHandler(err, req, res, next) {
  const { statusCode, message, details } = normalizeError(err);

  // La traza completa solo se ve en el servidor, nunca en la respuesta
  if (statusCode >= 500) console.error(err);

  res.status(statusCode).json({
    statusCode,
    error: STATUS_CODES[statusCode],
    message,
    ...(details && { details }),
  });
}
