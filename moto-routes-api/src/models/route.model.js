import mongoose from "mongoose";
import { buildSlug } from "../utils/slugify.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";

export const ROUTE_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  DELETED: "deleted",
});

const routeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 500 },
    difficulty: {
      type: String,
      required: true,
      enum: ["easy", "medium", "hard"],
    },
    distance: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 0 },
    startPoint: { type: String, required: true, trim: true, maxlength: 100 },
    endPoint: { type: String, required: true, trim: true, maxlength: 100 },
    status: {
      type: String,
      enum: Object.values(ROUTE_STATUS),
      default: ROUTE_STATUS.ACTIVE,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

routeSchema.plugin(softDeletePlugin, {
  deletedFields: { status: ROUTE_STATUS.DELETED },
});

// Campos derivados al crear: slug desde el título, isActive desde status
routeSchema.pre("validate", function () {
  if (this.isModified("title") || !this.slug) {
    this.slug = buildSlug(this.title, this._id);
  }
  this.isActive = this.status === ROUTE_STATUS.ACTIVE;
});

// Los mismos campos derivados al actualizar (PATCH y soft delete)
routeSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() ?? {};
  const title = update.title ?? update.$set?.title;
  const status = update.status ?? update.$set?.status;
  const id = this.getFilter()._id;

  if (title && id) this.set("slug", buildSlug(title, id));
  if (status) this.set("isActive", status === ROUTE_STATUS.ACTIVE);
});

export const Route = mongoose.model("Route", routeSchema);
