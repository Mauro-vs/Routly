import express from "express";

/**
 * La salud de la propia gateway, bajo /gateway para no pisar el /health de la API, que el panel
 * consulta para su indicador de conexión (api-status.service.ts) y que sigue yendo a la API.
 *
 * - GET /gateway/health: la gateway está viva. No toca a nadie.
 * - GET /gateway/ready: pregunta en paralelo al /health de cada servicio. 200 si contestan todos,
 *   503 si falla alguno, con el estado de cada uno.
 */
export function healthRouter({ services, timeoutMs, fetch: fetchImpl }) {
  const router = express.Router();

  router.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  router.get("/ready", async (req, res) => {
    const entries = await Promise.all(
      Object.values(services).map(async ({ name, target }) => {
        try {
          const response = await fetchImpl(`${target}/health`, { signal: AbortSignal.timeout(timeoutMs) });
          return [name, response.ok ? "up" : "down"];
        } catch {
          return [name, "down"];
        }
      }),
    );
    const status = Object.fromEntries(entries);
    const ok = entries.every(([, state]) => state === "up");
    res.status(ok ? 200 : 503).json({ ok, services: status });
  });

  return router;
}
