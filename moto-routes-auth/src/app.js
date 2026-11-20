import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { buildOpenApi } from "./docs/openapi.js";
import { createAuthenticate } from "./middlewares/authenticate.js";
import { createCheckOrigin } from "./middlewares/checkOrigin.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { createLimiters } from "./middlewares/rateLimit.js";
import { authRouter } from "./routes/auth.routes.js";
import { createAuthService } from "./services/auth.service.js";
import { createTokenService } from "./services/token.service.js";

/**
 * Monta el servicio de auth. La usan server.js (que solo conecta y arranca) y los tests, así que
 * los tests prueban la misma app que se ejecuta.
 *
 * Todo lo de fuera llega por parámetro: la configuración (config/env.js), las claves
 * (config/keys.js), el acceso a datos (repositories/, en los tests uno en memoria) y el reloj.
 */
export function createApp({ config, keys, repositories, now = Date.now }) {
  const isProduction = config.env === "production";
  const tokens = createTokenService({ keys, jwt: config.jwt, now });
  const auth = createAuthService({ repositories, tokens, now });
  const authenticate = createAuthenticate({ tokens, auth, cookies: config.cookies });
  const limiters = createLimiters({ enabled: config.rateLimit });

  const app = express();
  // Detrás de un proxy (o de la gateway): la IP del cliente para el límite de intentos
  app.set("trust proxy", config.trustProxy === 0 ? false : config.trustProxy);
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { frameAncestors: ["'none'"], upgradeInsecureRequests: isProduction ? [] : null },
      },
      xFrameOptions: { action: "deny" },
      strictTransportSecurity: isProduction,
    })
  );
  // En producción, solo los orígenes de CORS_ORIGIN y con credenciales (la cookie). En desarrollo
  // el panel y la web llegan por su proxy (mismo origen), así que CORS no entra en juego
  app.use(
    cors({
      origin: isProduction ? [...config.corsOrigins] : "*",
      methods: ["GET", "POST", "PATCH"],
      credentials: isProduction,
    })
  );
  // Los formatos de morgan no sacan cabeceras: ni Cookie ni Authorization acaban en los logs
  if (config.env !== "test") app.use(morgan(isProduction ? "combined" : "dev"));
  app.use(express.json({ limit: "10kb" }));
  app.use(createCheckOrigin({ allowedOrigins: config.corsOrigins, isProduction }));

  const health = (req, res) => res.json({ ok: true });
  app.get("/health", health);

  // Todo cuelga de /auth, como la API de /api y la IA de /ai: el proxy y la gateway enrutan por prefijo
  const router = express.Router();
  app.use("/auth", router);
  router.get("/health", health);

  // La clave pública: con ella la API, la IA y la gateway comprueban los tokens. Se puede cachear
  router.get("/.well-known/jwks.json", (req, res) => {
    res.set("Cache-Control", "public, max-age=300").json(keys.jwks);
  });

  if (config.swagger) {
    const spec = buildOpenApi(config);
    router.get("/docs.json", (req, res) => res.json(spec));
    router.use("/docs", swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: "Routly Auth" }));
  }

  // Nada de lo que lleva tokens o datos de la sesión se guarda en cachés
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.use(authRouter({ auth, tokens, authenticate, limiters, config }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
