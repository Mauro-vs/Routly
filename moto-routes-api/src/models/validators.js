// Validadores de Mongoose para las reglas que Zod comprueba con .int() y .multipleOf():
// así el modelo sigue siendo una segunda barrera completa

export const integer = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

// Céntimos: como mucho dos decimales (con margen para el redondeo de coma flotante)
export const twoDecimals = {
  validator: (value) => Math.abs(Math.round(value * 100) - value * 100) < 1e-9,
  message: "{PATH} must have at most 2 decimals",
};
