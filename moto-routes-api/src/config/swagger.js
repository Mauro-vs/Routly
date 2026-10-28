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
        "categorías, ubicaciones, rutas, experiencias, salidas e imágenes. Todas las " +
        "colecciones se activan, se desactivan y tienen papelera (soft delete).\n\n" +
        "Autenticación con JWT: POST /api/auth/login devuelve el token, que se envía en " +
        "Authorization: Bearer <token> (botón Authorize). Los endpoints con candado lo piden; " +
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
              enum: ["TOKEN_EXPIRED", "TOKEN_INVALID"],
              description: "Solo en algunos 401: por qué no sirve el token",
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
