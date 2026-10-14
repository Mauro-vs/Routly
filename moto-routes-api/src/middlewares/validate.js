/**
 * Valida la petición con esquemas de Zod antes de llegar al controlador.
 * Si algo no cumple, Zod lanza un ZodError que recoge el errorHandler (400).
 * El body se sustituye por los datos ya limpios (trim aplicado, sin campos extra).
 *
 * Uso: router.post("/", validate({ body: createRouteSchema }), controller.create)
 */
export function validate({ params, body }) {
  // reportInput permite al errorHandler distinguir "falta el campo" de "tipo incorrecto"
  const options = { reportInput: true };

  return (req, res, next) => {
    if (params) params.parse(req.params, options);
    if (body) req.body = body.parse(req.body ?? {}, options);
    next();
  };
}
