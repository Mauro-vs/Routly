import mongoose from "mongoose";

/**
 * Lista negra del logout: los tokens que se han cerrado antes de caducar. Solo se guarda su
 * jti (nunca el token, que es un dato sensible), de quién era y cuándo caduca.
 *
 * El índice TTL de expiresAt hace que MongoDB borre cada entrada sola cuando el token habría
 * caducado de todas formas: la lista no crece sin límite. No es un recurso del panel, así que
 * no lleva los plugins de estado, slug ni soft delete.
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
