import { z } from "zod";

/*
 * Lo que tiene que devolver la IA para el resumen de opiniones. Como en los textos del detalle, lo
 * que falta hace pedirlo otra vez y lo que sobra se recorta (repetir la llamada es lo que más tarda).
 */
const text = (max) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((value) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value));

// Una lista de como mucho max elementos (las de más se quitan)
const list = (item, min, max) => z.array(item).transform((items) => items.slice(0, max)).pipe(z.array(z.any()).min(min));

export const TOPIC_SENTIMENTS = Object.freeze(["positive", "neutral", "negative"]);

const topic = z.object({
  name: text(40),
  // En minúsculas: algún modelo contesta "Positive"
  sentiment: z.string().trim().toLowerCase().pipe(z.enum(TOPIC_SENTIMENTS)),
  // Un número de veces (algún modelo lo manda como texto, "3")
  mentions: z.coerce.number().min(0).transform(Math.round),
});

export const reviewsSummarySchema = z.object({
  summary: text(800),
  pros: list(text(160), 1, 4),
  cons: list(text(160), 0, 3).default([]),
  topics: list(topic, 1, 6),
});
