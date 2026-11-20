import mongoose from "mongoose";

/**
 * Las sesiones: un documento por refresh emitido. Solo se guarda su hash (SHA-256), nunca el token.
 *
 * Todos los refresh de un mismo login comparten familyId (el sid del token de acceso). Cada uso
 * marca usedAt y emite el siguiente de la familia: si llega uno ya usado (fuera de los segundos de
 * gracia), alguien lo ha copiado, y se cierra la familia entera.
 *
 * tokenVersion: el del usuario al abrir la sesión. Si ya no coincide (cerrar todas, cambio de
 * contraseña, desactivado desde el panel), el refresh no vale.
 *
 * El índice TTL de expiresAt borra cada documento cuando caduca: la colección no crece sin límite.
 */
const sessionSchema = new mongoose.Schema(
  {
    familyId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, immutable: true },
    tokenVersion: { type: Number, required: true, min: 0 },
    usedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Session = mongoose.model("Session", sessionSchema);
