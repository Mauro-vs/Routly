/*
 * La documentación OpenAPI del servicio, en /auth/docs (solo fuera de producción). Escrita a mano:
 * son pocos endpoints. Para probar en Swagger: login, copia el token del body y pulsa Authorize.
 */
const error = (description) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});
const session = (description) => ({
  description: `${description}. Deja las cookies routly_session (Path=/) y routly_refresh (Path=/auth)`,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Session" } } },
});
const json = (schema) => ({ required: true, content: { "application/json": { schema } } });

export function buildOpenApi(config) {
  return {
    openapi: "3.0.3",
    info: {
      title: "Routly Auth",
      version: "1.0.0",
      description:
        "Login, registro y sesiones de Routly. Firma los tokens de acceso (JWT RS256, " +
        `${config.jwt.accessTtl / 60} min) y publica su clave pública en /auth/.well-known/jwks.json. ` +
        "El refresh rota en cada uso y solo viaja en su cookie.",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "665f1c2e9b1e8a0012345678" },
            name: { type: "string", example: "Ana García" },
            email: { type: "string", example: "ana@routly.dev" },
            role: { type: "string", example: "rider" },
          },
        },
        Session: {
          type: "object",
          properties: {
            tokenType: { type: "string", example: "Bearer" },
            expiresIn: { type: "integer", example: config.jwt.accessTtl, description: "Segundos de vida del token de acceso" },
            refreshExpiresIn: { type: "integer", example: config.jwt.refreshTtl, description: "Segundos que se puede renovar la sesión con /auth/refresh" },
            user: { $ref: "#/components/schemas/User" },
            token: { type: "string", description: "El token de acceso. Solo con TOKEN_IN_BODY (no en producción)" },
          },
        },
        Error: {
          type: "object",
          properties: {
            statusCode: { type: "integer" },
            error: { type: "string" },
            message: { type: "string" },
            code: { type: "string", enum: ["TOKEN_EXPIRED", "TOKEN_INVALID"] },
            details: { type: "array", items: { type: "object", properties: { field: { type: "string" }, message: { type: "string" } } } },
          },
        },
      },
    },
    paths: {
      "/auth/register": {
        post: {
          tags: ["Sesión"],
          summary: "Crea una cuenta (siempre rider) y abre sesión",
          requestBody: json({
            type: "object",
            required: ["name", "email", "password"],
            properties: {
              name: { type: "string", example: "Ana García" },
              email: { type: "string", example: "ana@routly.dev" },
              password: { type: "string", example: "moto-1234", description: "8-128, con una letra y un número" },
            },
          }),
          responses: { 201: session("Cuenta creada"), 400: error("Datos no válidos"), 409: error("El correo ya está registrado"), 429: error("Demasiados intentos") },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Sesión"],
          summary: "Abre sesión con correo y contraseña",
          requestBody: json({
            type: "object",
            required: ["email", "password"],
            properties: { email: { type: "string", example: "admin@routly.dev" }, password: { type: "string", example: "routly-dev-1234" } },
          }),
          responses: { 200: session("Sesión abierta"), 401: error("Correo o contraseña incorrectos"), 429: error("Demasiados intentos") },
        },
      },
      "/auth/refresh": {
        post: {
          tags: ["Sesión"],
          summary: "Renueva la sesión con la cookie routly_refresh (y la cambia por otra)",
          responses: { 200: session("Sesión renovada"), 401: error("Refresh caducado, cerrado o reutilizado: borra las cookies") },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Sesión"],
          summary: "Cierra esta sesión (con la cookie de refresh, el token de acceso o los dos)",
          responses: { 204: { description: "Sesión cerrada y cookies borradas" } },
        },
      },
      "/auth/logout-all": {
        post: {
          tags: ["Sesión"],
          summary: "Cierra todas las sesiones del usuario",
          security: [{ bearer: [] }],
          responses: { 204: { description: "Todas cerradas" }, 401: error("Sin sesión") },
        },
      },
      "/auth/me": {
        get: {
          tags: ["Sesión"],
          summary: "Quién soy",
          security: [{ bearer: [] }],
          responses: {
            200: { description: "El usuario de la sesión", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
            401: error("Sin sesión"),
          },
        },
      },
      "/auth/password": {
        patch: {
          tags: ["Sesión"],
          summary: "Cambia la contraseña: cierra las demás sesiones y renueva esta",
          security: [{ bearer: [] }],
          requestBody: json({
            type: "object",
            required: ["currentPassword", "newPassword"],
            properties: { currentPassword: { type: "string" }, newPassword: { type: "string" } },
          }),
          responses: { 200: session("Contraseña cambiada"), 400: error("Contraseña actual incorrecta o nueva no válida"), 401: error("Sin sesión") },
        },
      },
      "/auth/.well-known/jwks.json": {
        get: {
          tags: ["Claves"],
          summary: "La clave pública (JWKS) para comprobar los tokens",
          responses: { 200: { description: "{ keys: [{ kty, n, e, kid, alg, use }] }" } },
        },
      },
      "/auth/health": { get: { tags: ["Estado"], summary: "Estado del servicio", responses: { 200: { description: "{ ok: true }" } } } },
    },
  };
}
