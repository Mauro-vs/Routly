import helmet from "helmet";

const isProduction = process.env.NODE_ENV === "production";

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      // Anti-clickjacking moderno: nadie puede incrustar la API en un <iframe>
      frameAncestors: ["'none'"],
      // En local (http) forzar https rompería la carga de Swagger UI
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  // Anti-clickjacking para navegadores antiguos que no soportan frame-ancestors
  xFrameOptions: { action: "deny" },
  // HSTS solo tiene sentido cuando se sirve por HTTPS
  strictTransportSecurity: isProduction,
});
