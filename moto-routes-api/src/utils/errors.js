export function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function notFound(resource) {
  return createError(`${resource} not found`, 404);
}

export function badRequest(message) {
  return createError(message, 400);
}

export function conflict(message) {
  return createError(message, 409);
}

// Error de validación de un campo concreto, con el mismo formato que los de Zod
export function fieldError(field, message) {
  const error = createError("Validation failed", 400);
  error.details = [{ field, message }];
  return error;
}
