// Formato de un ObjectId de MongoDB: 24 caracteres hexadecimales. Lo usan el esquema
// de Zod de los ids y la comprobación de los services.
export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
