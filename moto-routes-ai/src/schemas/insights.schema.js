import { z } from "zod";

/*
 * Lo que tiene que devolver la IA para el bloque Routly IA. Si falta algo, no se enseña y se pide
 * otra vez; si sobra (un texto largo, un punto de más), se recorta en vez de tirar la respuesta: los
 * modelos gratuitos se pasan a menudo, y repetir la llamada es lo que más tarda.
 */
const text = (max) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((value) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value));

// Una lista de como mucho max elementos (las de más se quitan)
const list = (item, min, max) => z.array(item).transform((items) => items.slice(0, max)).pipe(z.array(z.any()).min(min));

export const insightsSchema = z.object({
  summary: text(700),
  highlights: list(text(200), 2, 6),
  idealFor: z.object({ level: text(250), rider: text(250), bike: text(250) }),
  packing: list(text(120), 3, 10),
  faq: list(z.object({ question: text(200), answer: text(600) }), 2, 6),
});
