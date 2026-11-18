/*
 * Server-Sent Events (text/event-stream), en las dos direcciones:
 * - readSse: lee el streaming de OpenRouter, que manda líneas "data: {...}" y acaba con
 *   "data: [DONE]" (y a veces comentarios ": OPENROUTER PROCESSING" para mantener viva la conexión).
 * - createSseWriter: escribe el streaming del chat hacia la web, con un nombre por evento.
 */

/** Los "data" de un streaming SSE, ya como objetos. Termina con [DONE] o al cerrarse. */
export async function* readSse(body) {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).replace(/\r$/, "");
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        yield JSON.parse(data);
      } catch {
        // Una línea a medias o que no es JSON: se ignora
      }
    }
  }
}

/**
 * Escribe eventos SSE en una respuesta de Express. Las cabeceras no se mandan hasta el primer
 * evento: así, si algo falla antes (no hay clave, la experiencia no existe), la respuesta todavía
 * puede ser un error JSON normal con su código.
 */
export function createSseWriter(res) {
  let started = false;
  return {
    get started() {
      return started;
    },
    send(event, data) {
      if (res.writableEnded) return;
      if (!started) {
        started = true;
        res.status(200).set({
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
          // Que Nginx (o el futuro gateway) no lo guarde hasta el final
          "x-accel-buffering": "no",
        });
        res.flushHeaders();
      }
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    end() {
      if (!res.writableEnded) res.end();
    },
  };
}
