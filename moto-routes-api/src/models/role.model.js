import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";

// Límites de los campos: los usan este modelo y el esquema de Zod (schemas/role.schema.js).
export const ROLE_LIMITS = Object.freeze({
  nameMin: 2,
  nameMax: 30,
  labelMin: 2,
  labelMax: 50,
  descriptionMax: 200,
});

// La clave del rol: minúsculas, números y guiones ("admin", "guia-local")
export const ROLE_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const ROLE_COLLATION = Object.freeze({ locale: "es", strength: 1 });

// name es la clave que usa el código (admin, host, rider); label, el nombre visible
const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: ROLE_LIMITS.nameMin,
      maxlength: ROLE_LIMITS.nameMax,
      match: ROLE_NAME_PATTERN,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      minlength: ROLE_LIMITS.labelMin,
      maxlength: ROLE_LIMITS.labelMax,
    },
    description: { type: String, trim: true, maxlength: ROLE_LIMITS.descriptionMax },
    // Los roles base (admin, host, rider) no se pueden desactivar, eliminar ni renombrar
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

roleSchema.plugin(statusPlugin);
roleSchema.plugin(slugPlugin, { source: (doc) => doc.label, fields: ["label"] });
roleSchema.plugin(softDeletePlugin);

// La etiqueta también es única, sin distinguir mayúsculas ni tildes: "Anfitrión" = "anfitrion"
roleSchema.index({ label: 1 }, { unique: true, collation: ROLE_COLLATION });

export const Role = mongoose.model("Role", roleSchema);
