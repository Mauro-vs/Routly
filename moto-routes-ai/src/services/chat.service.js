import { chatSystemPrompt } from "../prompts/chat.prompt.js";
import { runTool, toolDefinitions, toolLabel } from "../tools/index.js";
import { aiUnavailable, upstreamError } from "../utils/errors.js";
import { readSse } from "../utils/sse.js";
import { experienceFacts } from "./facts.js";

/** Rondas de herramientas por pregunta como mucho. La última, sin herramientas: tiene que contestar. */
export const MAX_ROUNDS = 5;
/** Herramientas por ronda como mucho (un modelo puede pedir varias a la vez). */
const MAX_TOOL_CALLS = 4;

/**
 * Una ronda con streaming: va emitiendo el texto según llega y junta las llamadas a herramientas
 * (llegan en trozos: el nombre en uno y los argumentos repartidos en varios, por índice).
 */
async function streamRound(openRouter, { messages, tools, signal, onText }) {
  const response = await openRouter.openStream({ messages, tools, signal, temperature: 0.3 });
  let text = "";
  let model = null;
  const calls = [];

  for await (const chunk of readSse(response.body)) {
    if (chunk.error) throw upstreamError("OpenRouter", { status: chunk.error.code });
    model ??= chunk.model ?? null;
    const delta = chunk.choices?.[0]?.delta ?? {};
    if (delta.content) {
      text += delta.content;
      onText(delta.content);
    }
    for (const part of delta.tool_calls ?? []) {
      const index = part.index ?? 0;
      calls[index] ??= { id: part.id ?? `call_${index}`, name: "", arguments: "" };
      if (part.id) calls[index].id = part.id;
      if (part.function?.name) calls[index].name += part.function.name;
      if (part.function?.arguments) calls[index].arguments += part.function.arguments;
    }
  }
  return { text, model, calls: calls.filter(Boolean) };
}

/**
 * El chatbot: un bucle de agente. El modelo contesta o pide herramientas; si las pide, se ejecutan
 * (solo lectura) y se le devuelven los resultados, hasta MAX_ROUNDS. Todo lo que pasa se emite
 * como eventos para la web: "tool" (qué está consultando), "delta" (texto) y "done".
 *
 * El historial lo guarda la web y llega entero en cada pregunta: el servidor no guarda nada.
 */
export function createChatService({ openRouter, services }) {
  return {
    /**
     * Comprueba lo que se puede comprobar antes de empezar a mandar (para responder con un error
     * normal): que hay IA y que la experiencia del contexto existe. Devuelve sus datos.
     */
    async prepare({ experienceSlug }) {
      if (!openRouter.enabled) throw aiUnavailable();
      return experienceSlug ? experienceFacts(await services.catalog.experience(experienceSlug)) : null;
    },

    async run({ messages: history, facts, signal, emit }) {
      const messages = [{ role: "system", content: chatSystemPrompt({ experienceFacts: facts }) }, ...history];
      let model = null;

      for (let round = 1; round <= MAX_ROUNDS; round++) {
        const last = round === MAX_ROUNDS;
        const result = await streamRound(openRouter, {
          messages,
          tools: last ? undefined : toolDefinitions,
          signal,
          onText: (text) => emit("delta", { text }),
        });
        model = result.model ?? model;
        if (result.calls.length === 0 || last) break;

        const calls = result.calls.slice(0, MAX_TOOL_CALLS);
        messages.push({
          role: "assistant",
          content: result.text || null,
          tool_calls: calls.map((call) => ({ id: call.id, type: "function", function: { name: call.name, arguments: call.arguments || "{}" } })),
        });
        for (const call of calls) {
          emit("tool", { name: call.name, label: toolLabel(call.name) });
          const output = await runTool(services, call.name, call.arguments);
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(output) });
        }
      }
      emit("done", { model });
    },
  };
}
