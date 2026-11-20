import mongoose from "mongoose";

/*
 * La colección users es de la API (moto-routes-api/src/models/user.model.js): ella la crea, le
 * pone los índices y la gestiona desde el panel. Este modelo solo declara los campos que usa el
 * auth, con autoIndex apagado para no tocar sus índices.
 *
 * Quién escribe qué: auth escribe passwordHash y tokenVersion (login, contraseña, cerrar sesiones)
 * y crea el usuario en el registro; el resto de cambios los hace la API. Si cambias un campo aquí,
 * mira el modelo de la API.
 */
export const USER_LIMITS = Object.freeze({ nameMin: 2, nameMax: 100, emailMax: 254 });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: USER_LIMITS.nameMin, maxlength: USER_LIMITS.nameMax },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: USER_LIMITS.emailMax },
    passwordHash: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0, min: 0, select: false },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    // Los de los plugins de la API (status, slug, softDelete), escritos a mano
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isActive: { type: Boolean, default: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, autoIndex: false }
);

userSchema.virtual("role", { ref: "Role", localField: "roleId", foreignField: "_id", justOne: true });

export const User = mongoose.model("User", userSchema);
