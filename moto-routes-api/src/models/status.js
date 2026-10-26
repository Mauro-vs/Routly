// Estados comunes a todas las colecciones. isActive siempre es status === "active".
// Eliminar no es un estado: lo marca deletedAt (plugin softDelete), y el documento
// conserva el estado que tenía.
export const STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
});

export const statusFromActive = (isActive) => (isActive ? STATUS.ACTIVE : STATUS.INACTIVE);

// Al restaurar: si se pide un estado se aplica; si no, vuelve con el que tenía
export const restoredStatus = (isActive) =>
  isActive === undefined ? {} : { status: statusFromActive(isActive) };
