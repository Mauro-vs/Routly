import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";

// Límites de los campos: los usan este modelo y el esquema de Zod (schemas/user.schema.js).
// La contraseña no está: no se guarda, solo su hash
export const USER_LIMITS = Object.freeze({ nameMin: 2, nameMax: 100, emailMax: 254 });

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: USER_LIMITS.nameMin,
      maxlength: USER_LIMITS.nameMax,
    },
    // Único también entre los eliminados: el correo queda reservado para poder restaurar
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: USER_LIMITS.emailMax,
    },
    // Nunca sale en las consultas: hay que pedirlo explícitamente con select("+passwordHash")
    passwordHash: { type: String, required: true, select: false },
    // Va en el token (tv): al subirlo (cambio de contraseña, desactivar, eliminar, cerrar
    // todas las sesiones) los tokens anteriores dejan de servir. Tampoco sale nunca.
    tokenVersion: { type: Number, default: 0, min: 0, select: false },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true, index: true },
  },
  { timestamps: true }
);

userSchema.virtual("role", {
  ref: "Role",
  localField: "roleId",
  foreignField: "_id",
  justOne: true,
});

// Su perfil (User 1 → 1 Profile): el perfil guarda el userId, el usuario no guarda nada
userSchema.virtual("profile", {
  ref: "Profile",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

userSchema.plugin(statusPlugin);
userSchema.plugin(slugPlugin, { source: (doc) => doc.name, fields: ["name"] });
userSchema.plugin(softDeletePlugin);

export const User = mongoose.model("User", userSchema);
