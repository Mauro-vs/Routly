import { Router } from "express";
import { createLimiter } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.js";
import { chatBodySchema } from "../schemas/chat.schema.js";

/** POST /ai/chat: el chatbot en streaming. Lo que hace: controllers/chat.controller.js */
export function chatRouter(controller) {
  const router = Router();
  // Cada mensaje cuesta una o varias llamadas a la IA
  router.use(createLimiter({ limit: 20, windowMs: 10 * 60 * 1000 }));

  router.post("/", validate({ body: chatBodySchema }), controller.send);

  return router;
}
