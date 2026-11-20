import { RevokedToken } from "../models/revokedToken.model.js";

// La lista negra la escribe el servicio de auth (logout). La API solo pregunta
export const revokedTokenRepository = {
  isRevoked(jti) {
    return RevokedToken.exists({ jti });
  },
};
