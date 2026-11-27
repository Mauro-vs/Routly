/**
 * El resumen IA de las opiniones de una experiencia o de un guía. Responde { data }: el resumen,
 * o null si no hay bastantes opiniones con comentario. Sin try/catch: Express 5 manda solo al
 * errorHandler cualquier error de un async.
 */
export function createReviewsController({ reviewsSummary }) {
  return {
    summary: (targetType) => async (req, res) => {
      res.json({ data: await reviewsSummary.forTarget(targetType, req.params.slug) });
    },
  };
}
