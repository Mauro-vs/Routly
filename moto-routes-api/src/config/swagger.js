import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Moto Routes API",
      version: "1.0.0",
      description: "API REST para gestionar rutas de motos",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: "Development server",
      },
    ],
    components: {
      schemas: {
        Route: {
          type: "object",
          properties: {
            _id: { type: "string", example: "664f1a2b3c4d5e6f7a8b9c0d" },
            title: { type: "string", example: "Costa Brava Loop" },
            slug: { type: "string", example: "costa-brava-loop-8b9c0d" },
            description: {
              type: "string",
              example: "Ruta costera con vistas espectaculares",
            },
            difficulty: {
              type: "string",
              enum: ["easy", "medium", "hard"],
              example: "medium",
            },
            distance: { type: "number", example: 180 },
            duration: { type: "number", example: 4 },
            startPoint: { type: "string", example: "Barcelona" },
            endPoint: { type: "string", example: "Barcelona" },
            status: {
              type: "string",
              enum: ["active", "inactive", "deleted"],
              example: "active",
            },
            isActive: { type: "boolean", example: true },
            deletedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: null,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2024-05-23T10:30:00.000Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              example: "2024-05-23T10:30:00.000Z",
            },
          },
        },
        CreateRouteInput: {
          type: "object",
          required: [
            "title",
            "difficulty",
            "distance",
            "duration",
            "startPoint",
            "endPoint",
          ],
          properties: {
            title: { type: "string", maxLength: 120, example: "Ruta del Cañón" },
            description: {
              type: "string",
              maxLength: 500,
              example: "Travesía por los desfiladeros del norte",
            },
            difficulty: {
              type: "string",
              enum: ["easy", "medium", "hard"],
              example: "hard",
            },
            distance: { type: "number", minimum: 0, example: 250 },
            duration: { type: "number", minimum: 0, example: 6 },
            startPoint: { type: "string", maxLength: 100, example: "Santander" },
            endPoint: { type: "string", maxLength: 100, example: "Bilbao" },
          },
        },
        UpdateRouteInput: {
          type: "object",
          properties: {
            title: { type: "string", maxLength: 120 },
            description: { type: "string", maxLength: 500 },
            difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
            distance: { type: "number", minimum: 0 },
            duration: { type: "number", minimum: 0 },
            startPoint: { type: "string", maxLength: 100 },
            endPoint: { type: "string", maxLength: 100 },
            status: {
              type: "string",
              enum: ["active", "inactive"],
              description: "isActive se sincroniza automáticamente",
            },
          },
        },
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
                  field: { type: "string", example: "distance" },
                  message: {
                    type: "string",
                    example: "distance must be greater than or equal to 0",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ["./src/docs/*.yaml"],
};

export const swaggerSpec = swaggerJsdoc(options);
