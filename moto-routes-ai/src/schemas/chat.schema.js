import { z } from "zod";
import { slug } from "./common.schema.js";

/** Los límites de una conversación: lo que cabe en una petición (y lo que se paga por ella). */
export const CHAT_LIMITS = Object.freeze({ messages: 20, content: 2000 });

/**
 * POST /ai/chat. La web manda la conversación entera (solo user y assistant: el prompt de sistema
 * y las herramientas los pone el servidor, nunca el cliente) y, en el detalle, su experiencia.
 */
export const chatBodySchema = z
  .strictObject({
    messages: z
      .array(z.strictObject({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(CHAT_LIMITS.content) }))
      .min(1)
      .max(CHAT_LIMITS.messages),
    experienceSlug: slug.optional(),
  })
  .refine((body) => body.messages.at(-1).role === "user", {
    message: "the last message must be from the user",
    path: ["messages"],
  });
