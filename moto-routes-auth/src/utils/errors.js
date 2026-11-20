// Los mismos errores que la API (moto-routes-api/src/utils/errors.js): el errorHandler los
// convierte en { statusCode, error, message, code?, details? }

export function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function conflict(message) {
  return createError(message, 409);
}

/**
 * 401: no hay sesión, o el token no sirve. El mensaje es siempre el mismo para no dar pistas;
 * code (TOKEN_EXPIRED, TOKEN_INVALID) solo distingue los casos para el cliente.
 */
export function unauthorized(code) {
  const error = createError("Authentication required", 401);
  if (code) error.code = code;
  return error;
}

export function forbidden(message = "You do not have permission to access this resource") {
  return createError(message, 403);
}

// Error de validación de un campo concreto, con el mismo formato que los de Zod
export function fieldError(field, message) {
  const error = createError("Validation failed", 400);
  error.details = [{ field, message }];
  return error;
}
