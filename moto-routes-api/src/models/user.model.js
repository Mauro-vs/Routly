import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";
import { DELETED_FIELDS } from "./status.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    // Único también entre los eliminados: el correo queda reservado para poder restaurar
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // Nunca sale en las consultas: hay que pedirlo explícitamente con select("+passwordHash")
    passwordHash: { type: String, required: true, select: false },
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

userSchema.plugin(statusPlugin);
userSchema.plugin(slugPlugin, { source: (doc) => doc.name, fields: ["name"] });
userSchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const User = mongoose.model("User", userSchema);
