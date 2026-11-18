import { Router } from "express";
import { createLimiter } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.js";
import { chatBodySchema } from "../schemas/chat.schema.js";
import { createSseWriter } from "../utils/sse.js";

/**
 * POST /ai/chat: el chatbot, con la respuesta en streaming (text/event-stream). Eventos:
 * - tool   { name, label }  está consultando algo ("Buscando experiencias")
 * - delta  { text }         un trozo de la respuesta
 * - done   { model }        ha terminado, y qué modelo ha respondido
 * - error  { message }      ha fallado a mitad (si falla antes de empezar, es un error JSON normal)
 */
export function chatRouter({ chat }) {
  const router = Router();
  // Cada mensaje cuesta una o varias llamadas a la IA
  router.use(createLimiter({ limit: 20, windowMs: 10 * 60 * 1000 }));

  router.post("/", validate({ body: chatBodySchema }), async (req, res) => {
    const facts = await chat.prepare(req.body);

    // Si el usuario cierra el chat o la página, se deja de pedir a la IA (y de pagar)
    const controller = new AbortController();
    res.on("close", () => controller.abort());

    const sse = createSseWriter(res);
    try {
      await chat.run({ messages: req.body.messages, facts, signal: controller.signal, emit: sse.send });
    } catch (error) {
      if (controller.signal.aborted) return;
      if (!sse.started) throw error;
      console.warn(`[chat] ${error.message}`);
      sse.send("error", { message: error.status === 503 ? error.message : "The assistant failed, please try again" });
    } finally {
      // Sin haber empezado, la respuesta la manda el errorHandler (el throw de arriba)
      if (sse.started) sse.end();
    }
  });

  return router;
}
