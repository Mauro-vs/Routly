import mongoose from "mongoose";

/**
 * Lista negra del logout: los tokens de acceso que se han cerrado antes de caducar. Solo su jti,
 * de quién era y cuándo caduca. La escribe este servicio y la lee la API en cada petición.
 *
 * Es el mismo esquema e índices que tenía la API (moto-routes-api/src/models/revokedToken.model.js):
 * los dos crean los mismos índices, así que no chocan. El TTL borra cada entrada al caducar el token.
 */
const revokedTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true, immutable: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const RevokedToken = mongoose.model("RevokedToken", revokedTokenSchema);
