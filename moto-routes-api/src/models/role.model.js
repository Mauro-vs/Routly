import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";

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
      minlength: 2,
      maxlength: 30,
      match: /^[a-z0-9]+(-[a-z0-9]+)*$/,
    },
    label: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    description: { type: String, trim: true, maxlength: 200 },
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
