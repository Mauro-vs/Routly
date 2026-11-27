/**
 * El bloque Routly IA del detalle de una experiencia: /ai/experiences/:slug/...
 * Cada método lee la petición, llama a su service y responde { data }. Sin try/catch: Express 5
 * manda solo al errorHandler cualquier error de un async.
 *
 * Los services llegan por parámetro (los crea app.js): así los tests usan unos con fetch falso.
 */
export function createExperiencesController({ insights, weather, stops, routeMap }) {
  return {
    // Los textos IA: resumen, para quién es, qué llevar y preguntas frecuentes
    async insights(req, res) {
      res.json({ data: await insights.forExperience(req.params.slug) });
    },

    async weather(req, res) {
      res.json({ data: await weather.forExperience(req.params.slug) });
    },

    async stops(req, res) {
      res.json({ data: await stops.forExperience(req.params.slug) });
    },

    // El mapa: el recorrido por carretera y los restaurantes que hay a lo largo
    async routeMap(req, res) {
      res.json({ data: await routeMap.forExperience(req.params.slug) });
    },
  };
}
