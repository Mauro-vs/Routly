import swaggerJsdoc from "swagger-jsdoc";
import { apiPaths, apiSchemas, apiTags } from "../docs/openapi.js";

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
        "colecciones se activan, se desactivan y tienen papelera (soft delete).",
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
      schemas: {
        ...apiSchemas,
        ErrorResponse: {
          type: "object",
          properties: {
            statusCode: { type: "integer", example: 400 },
            error: { type: "string", example: "Bad Request" },
            message: { type: "string", example: "Validation failed" },
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
