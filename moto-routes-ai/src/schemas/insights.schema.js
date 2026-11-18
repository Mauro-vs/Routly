import { z } from "zod";

// Lo que tiene que devolver la IA para el bloque Routly IA. Si no cumple, no se enseña: se pide otra vez
const text = (max) => z.string().trim().min(1).max(max);

export const insightsSchema = z.object({
  summary: text(700),
  highlights: z.array(text(200)).min(2).max(6),
  idealFor: z.object({ level: text(250), rider: text(250), bike: text(250) }),
  packing: z.array(text(120)).min(3).max(10),
  faq: z.array(z.object({ question: text(200), answer: text(600) })).min(2).max(6),
});
