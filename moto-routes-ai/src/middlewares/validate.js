/**
 * Valida la petición con esquemas de Zod antes de llegar a la ruta, como en la API. Si algo no
 * cumple, el ZodError llega al errorHandler (400). Se sustituyen por los datos ya limpios.
 */
export function validate({ params, body, query }) {
  return (req, res, next) => {
    if (params) req.params = params.parse(req.params);
    if (body) req.body = body.parse(req.body ?? {});
    // En Express 5 req.query es de solo lectura: se redefine con los datos limpios
    if (query) Object.defineProperty(req, "query", { value: query.parse(req.query), writable: true, enumerable: true });
    next();
  };
}
