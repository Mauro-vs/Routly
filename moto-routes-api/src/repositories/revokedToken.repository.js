import { RevokedToken } from "../models/revokedToken.model.js";

export const revokedTokenRepository = {
  isRevoked(jti) {
    return RevokedToken.exists({ jti });
  },

  // Idempotente: cerrar dos veces la misma sesión no falla ni duplica la entrada
  revoke({ jti, userId, expiresAt }) {
    return RevokedToken.updateOne(
      { jti },
      { $setOnInsert: { jti, userId, expiresAt } },
      { upsert: true }
    );
  },
};
