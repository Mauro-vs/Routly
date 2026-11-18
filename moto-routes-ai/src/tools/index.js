import { z } from "zod";
import { slug } from "../schemas/common.schema.js";
import { departureFacts, experienceFacts, stopsFacts, weatherFacts } from "../services/facts.js";

/*
 * Las herramientas del chatbot (tool calling): lo único que el modelo puede hacer es llamarlas, y
 * todas son de solo lectura sobre la tienda pública, el tiempo y OpenStreetMap. Cada una tiene:
 * - definition: lo que ve el modelo (nombre, para qué sirve y sus parámetros en JSON Schema).
 * - args: el esquema de Zod con el que se comprueba lo que manda el modelo (no hay que fiarse).
 * - label: lo que la web enseña mientras se ejecuta ("Buscando experiencias...").
 * - run: lo que hace, con los services. Devuelve datos cortos: cuantos menos tokens, mejor.
 */

const DIFFICULTIES = ["easy", "medium", "hard"];
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date YYYY-MM-DD");
const SEARCH_LIMIT = 6;

const linkOf = (experienceSlug) => `/experiencias/${experienceSlug}`;

// Una experiencia del Shop, en corto, con el enlace a su detalle en la web
const card = (experience) => ({
  slug: experience.slug,
  enlace: linkOf(experience.slug),
  titulo: experience.title,
  dificultad: experience.route?.difficulty ?? null,
  km: experience.route?.distance ?? null,
  tipo: experience.route?.category?.name ?? null,
  salida: experience.route?.startLocation?.city ?? null,
  llegada: experience.route?.endLocation?.city ?? null,
  precioDesdeEuros: experience.priceFrom ?? null,
  proximaSalida: experience.nextDepartureAt ?? null,
});

const slugOnly = z.strictObject({ slug });
const slugParameters = {
  type: "object",
  properties: { slug: { type: "string", description: "El slug de la experiencia, tal como sale en las búsquedas" } },
  required: ["slug"],
  additionalProperties: false,
};

const TOOLS = [
  {
    name: "buscar_experiencias",
    label: "Buscando experiencias",
    description:
      "Busca experiencias (salidas guiadas en moto) en la tienda de Routly. Úsala para recomendar. Todos los filtros son opcionales; las categorías y destinos van por slug (usa listar_categorias o listar_destinos para conocerlos).",
    parameters: {
      type: "object",
      properties: {
        busqueda: { type: "string", description: "Palabras del título o la descripción, p. ej. 'pirineo' o 'costa'" },
        categoria: { type: "string", description: "Slug de una categoría (tipo de ruta)" },
        destino: { type: "string", description: "Slug de un destino (ciudad de salida o llegada)" },
        dificultad: { type: "string", enum: DIFFICULTIES, description: "easy = fácil, medium = media, hard = difícil" },
        desde: { type: "string", description: "Solo con salidas a partir de esta fecha (YYYY-MM-DD)" },
        hasta: { type: "string", description: "Solo con salidas hasta esta fecha (YYYY-MM-DD)" },
        precioMaximo: { type: "number", description: "Euros por persona como mucho" },
        orden: { type: "string", enum: ["priceFrom", "nextDepartureAt", "-createdAt"], description: "Más baratas, más próximas o más nuevas" },
      },
      additionalProperties: false,
    },
    args: z.strictObject({
      busqueda: z.string().trim().max(100).optional(),
      categoria: slug.optional(),
      destino: slug.optional(),
      dificultad: z.enum(DIFFICULTIES).optional(),
      desde: date.optional(),
      hasta: date.optional(),
      precioMaximo: z.number().min(0).max(100_000).optional(),
      orden: z.enum(["priceFrom", "nextDepartureAt", "-createdAt"]).optional(),
    }),
    async run({ routly }, args) {
      const { data, pagination } = await routly.experiences({
        search: args.busqueda,
        category: args.categoria,
        location: args.destino,
        difficulty: args.dificultad,
        from: args.desde,
        to: args.hasta,
        priceMax: args.precioMaximo,
        // Con un filtro de fecha o de precio, solo las que tienen salidas que lo cumplen
        ...((args.desde || args.hasta || args.precioMaximo !== undefined) && { hasDepartures: "true" }),
        sort: args.orden,
        limit: SEARCH_LIMIT,
      });
      return { total: pagination?.total ?? data.length, experiencias: data.map(card) };
    },
  },
  {
    name: "ver_experiencia",
    label: "Leyendo la experiencia",
    description: "Todos los datos de una experiencia: descripción, ruta, anfitrión, moto del guía, precio desde y punto de encuentro.",
    parameters: slugParameters,
    args: slugOnly,
    async run({ catalog }, { slug: experienceSlug }) {
      return { ...experienceFacts(await catalog.experience(experienceSlug)), enlace: linkOf(experienceSlug) };
    },
  },
  {
    name: "ver_salidas",
    label: "Mirando las fechas",
    description: "Las salidas reservables de una experiencia (fecha, precio y plazas libres), de la más próxima a la más lejana.",
    parameters: slugParameters,
    args: slugOnly,
    async run({ catalog }, { slug: experienceSlug }) {
      return { salidas: departureFacts(await catalog.departures(experienceSlug)) };
    },
  },
  {
    name: "listar_categorias",
    label: "Mirando los tipos de ruta",
    description: "Las categorías (tipos de ruta: montaña, costa...) con experiencias, con su slug y cuántas tienen.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    args: z.strictObject({}),
    async run({ routly }) {
      return { categorias: (await routly.categories()).map((item) => ({ nombre: item.name, slug: item.slug, experiencias: item.experienceCount })) };
    },
  },
  {
    name: "listar_destinos",
    label: "Mirando los destinos",
    description: "Los destinos (ciudades de salida o llegada) con experiencias, con su slug y cuántas tienen.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    args: z.strictObject({}),
    async run({ routly }) {
      return {
        destinos: (await routly.locations()).map((item) => ({ ciudad: item.city, region: item.region ?? null, slug: item.slug, experiencias: item.experienceCount })),
      };
    },
  },
  {
    name: "tiempo_experiencia",
    label: "Mirando el tiempo",
    description: "El tiempo de las próximas salidas de una experiencia: previsión si es en menos de 16 días o, si no, lo que hizo esos días el año pasado.",
    parameters: slugParameters,
    args: slugOnly,
    async run({ weather }, { slug: experienceSlug }) {
      return { tiempo: weatherFacts(await weather.forExperience(experienceSlug)) };
    },
  },
  {
    name: "paradas_experiencia",
    label: "Buscando paradas",
    description: "Sitios reales de OpenStreetMap cerca de la salida y la llegada: dónde comer, gasolineras y miradores.",
    parameters: slugParameters,
    args: slugOnly,
    async run({ stops }, { slug: experienceSlug }) {
      return { paradas: stopsFacts(await stops.forExperience(experienceSlug)) };
    },
  },
];

const BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

/** Lo que se le manda a OpenRouter en "tools". */
export const toolDefinitions = TOOLS.map(({ name, description, parameters }) => ({
  type: "function",
  function: { name, description, parameters },
}));

/** El texto que enseña la web mientras corre una herramienta. */
export const toolLabel = (name) => BY_NAME.get(name)?.label ?? "Consultando";

/** Lo más largo que puede devolver una herramienta al modelo (caracteres de JSON). */
export const TOOL_RESULT_MAX = 6000;

/**
 * Ejecuta una llamada del modelo. Nunca lanza: un error (herramienta que no existe, argumentos que
 * no valen, experiencia que no existe, servicio caído) vuelve al modelo como { error }, para que se
 * lo explique al usuario o pruebe otra cosa.
 */
export async function runTool(services, name, rawArguments) {
  const tool = BY_NAME.get(name);
  if (!tool) return { error: `Unknown tool ${name}` };

  let args;
  try {
    args = tool.args.parse(rawArguments ? JSON.parse(rawArguments) : {});
  } catch {
    return { error: "Invalid arguments for this tool" };
  }

  try {
    const result = JSON.stringify(await tool.run(services, args));
    return result.length > TOOL_RESULT_MAX ? { error: "The result was too long" } : JSON.parse(result);
  } catch (error) {
    if (error.status === 404) return { error: "Not found: check the slug with buscar_experiencias" };
    return { error: "This information is not available right now" };
  }
}
