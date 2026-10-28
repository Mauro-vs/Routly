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

/**
 * 401: no hay sesión, o el token no sirve. El mensaje es siempre el mismo para no dar
 * pistas; code (TOKEN_EXPIRED, TOKEN_INVALID) solo distingue los casos para el cliente.
 */
export function unauthorized(code) {
  const error = createError("Authentication required", 401);
  if (code) error.code = code;
  return error;
}

// 403: hay sesión, pero el rol o la propiedad del recurso no lo permiten
export function forbidden() {
  return createError("You do not have permission to access this resource", 403);
}

// Error de validación de un campo concreto, con el mismo formato que los de Zod
export function fieldError(field, message) {
  const error = createError("Validation failed", 400);
  error.details = [{ field, message }];
  return error;
}
