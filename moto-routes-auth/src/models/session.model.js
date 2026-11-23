import mongoose from "mongoose";

export const SESSION_STATUSES = ["active", "used", "revoked"];

/**
 * Las sesiones: un documento por refresh emitido. Solo se guarda su hash (SHA-256), nunca el token.
 *
 * status dice en qué punto está cada refresh:
 *   - active: recién emitido, se puede gastar una vez.
 *   - used: ya se gastó (usedAt dice cuándo) y se emitió el siguiente de la familia.
 *   - revoked: cerrado a mano (logout, cerrar todas, reutilización detectada...). revokedAt dice cuándo.
 *
 * Todos los refresh de un mismo login comparten familyId (el sid del token de acceso). Cada uso
 * lo pasa de active a used y emite el siguiente de la familia: si llega uno ya usado (fuera de los
 * segundos de gracia), alguien lo ha copiado, y se revocan todas las sesiones del usuario.
 *
 * tokenVersion: el del usuario al abrir la sesión. Si ya no coincide (cerrar todas, cambio de
 * contraseña, desactivado desde el panel), el refresh no vale.
 *
 * El índice TTL de expiresAt borra cada documento cuando caduca: la colección no crece sin límite.
 * Los revocados se quedan hasta entonces (se ve en Compass quién cerró qué) y luego también se van.
 */
const sessionSchema = new mongoose.Schema(
  {
    familyId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, immutable: true },
    tokenVersion: { type: Number, required: true, min: 0 },
    status: { type: String, enum: SESSION_STATUSES, default: "active", required: true },
    usedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Session = mongoose.model("Session", sessionSchema);
