// Estados comunes a todas las colecciones. isActive siempre es status === "active".
export const STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  DELETED: "deleted",
});

// Lo que se fija al eliminar con el plugin softDelete
export const DELETED_FIELDS = Object.freeze({ status: STATUS.DELETED, isActive: false });

export const statusFromActive = (isActive) => (isActive ? STATUS.ACTIVE : STATUS.INACTIVE);
