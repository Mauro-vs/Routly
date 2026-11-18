import helmet from "helmet";

// Solo responde JSON y streaming: nadie lo incrusta en un <iframe> ni carga scripts suyos
export const helmetMiddleware = (isProduction) =>
  helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    xFrameOptions: { action: "deny" },
    strictTransportSecurity: isProduction,
  });
