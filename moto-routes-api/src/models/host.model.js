import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";

// Perfil público de un anfitrión. La cuenta está en users.
const hostSchema = new mongoose.Schema(
  {
    // Un usuario tiene como mucho un perfil de anfitrión
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    biography: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

hostSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

hostSchema.plugin(statusPlugin);
hostSchema.plugin(slugPlugin, { source: (doc) => doc.name, fields: ["name"] });
hostSchema.plugin(softDeletePlugin);

export const Host = mongoose.model("Host", hostSchema);
