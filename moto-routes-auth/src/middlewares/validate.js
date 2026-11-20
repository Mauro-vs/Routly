/**
 * Valida el body con un esquema de Zod antes del controlador y lo cambia por los datos limpios
 * (trim, minúsculas, sin campos extra). Si algo no cumple, el ZodError llega al errorHandler (400).
 */
export function validate({ body }) {
  return (req, res, next) => {
    req.body = body.parse(req.body ?? {}, { reportInput: true });
    next();
  };
}
