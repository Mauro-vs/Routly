import swaggerJsdoc from "swagger-jsdoc";
import { apiComponents, apiPaths, apiSchemas, apiTags } from "../docs/openapi.js";

// Las rutas y los esquemas de cada recurso se generan en src/docs/openapi.js
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Routly API",
      version: "2.0.0",
      description:
        "API REST de Routly, la plataforma de rutas en moto: roles, usuarios, anfitriones, " +
        "categorías, ubicaciones, rutas, experiencias, salidas, imágenes y opiniones. Todas las " +
        "colecciones se activan, se desactivan y tienen papelera (soft delete).\n\n" +
        "Autenticación con JWT: el login es del servicio de auth (POST /auth/login, puerto 3002), " +
        "que firma el token con RS256. Se envía en Authorization: Bearer <token> (botón Authorize) " +
        "o en la cookie de sesión del panel. Los endpoints con candado lo piden; " +
        "su descripción dice quién puede usarlos: cualquier sesión, solo admin, o admin y el dueño.",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: "Development server",
      },
    ],
    tags: apiTags,
    paths: apiPaths,
    components: {
      ...apiComponents,
      schemas: {
        ...apiSchemas,
        ErrorResponse: {
          type: "object",
          properties: {
            statusCode: { type: "integer", example: 400 },
            error: { type: "string", example: "Bad Request" },
            message: { type: "string", example: "Validation failed" },
            code: {
              type: "string",
              enum: ["TOKEN_EXPIRED", "TOKEN_INVALID", "REVIEW_ALREADY_EXISTS", "OWN_TARGET", "COMMENT_REQUIRED_FOR_LOW_RATING", "INVALID_IMAGE", "PHOTO_TOO_LARGE", "TOO_MANY_PHOTOS"],
              description:
                "Solo en algunos errores: por qué no sirve el token (401) o qué regla de las opiniones no se cumple (400, 403, 409)",
            },
            details: {
              type: "array",
              description: "Solo en errores de validación",
              items: {
                type: "object",
                properties: {
                  field: { type: "string", example: "categoryId" },
                  message: {
                    type: "string",
                    example: "categoryId must reference an active category",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
