import cors from "cors";

const isProduction = process.env.NODE_ENV === "production";

// En producción solo se aceptan los orígenes de CORS_ORIGIN (separados por comas).
// Si no se define, no se acepta ningún origen externo.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsMiddleware = cors({
  origin: isProduction ? allowedOrigins : "*",
  methods: ["GET", "POST", "PATCH"],
});
