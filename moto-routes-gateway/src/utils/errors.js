// Errores con su código HTTP. El errorHandler los convierte al formato común de Routly.

export function createError(message, status, extra = {}) {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
}
