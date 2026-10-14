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
