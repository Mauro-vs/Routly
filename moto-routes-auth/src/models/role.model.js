import mongoose from "mongoose";

// Solo lectura: los roles son de la API. El auth necesita su name (va en el token) y si está activo
const roleSchema = new mongoose.Schema(
  {
    name: { type: String },
    isActive: { type: Boolean },
    deletedAt: { type: Date, default: null },
  },
  { autoIndex: false }
);

export const Role = mongoose.model("Role", roleSchema);
