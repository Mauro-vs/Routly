import { STATUS } from "../status.js";

/**
 * Añade `status` e `isActive` a un esquema y mantiene isActive derivado de status,
 * tanto al guardar un documento como en las actualizaciones (PATCH, activar,
 * restaurar y cualquier updateOne o updateMany).
 */
export function statusPlugin(schema) {
  schema.add({
    status: { type: String, enum: Object.values(STATUS), default: STATUS.ACTIVE },
    isActive: { type: Boolean, default: true },
  });

  schema.pre("validate", function () {
    this.isActive = this.status === STATUS.ACTIVE;
  });

  schema.pre(["findOneAndUpdate", "updateOne", "updateMany"], function () {
    const update = this.getUpdate() ?? {};
    const status = update.status ?? update.$set?.status;
    if (status) this.set("isActive", status === STATUS.ACTIVE);
  });
}
