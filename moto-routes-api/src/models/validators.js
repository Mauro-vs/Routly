// Validadores de Mongoose para las reglas que Zod comprueba con .int(), .positive() y .multipleOf():
// así el modelo sigue siendo una segunda barrera completa

export const integer = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

// Mayor que 0, sin el 0: el min de Mongoose siempre lo incluye
export const positive = {
  validator: (value) => value > 0,
  message: "{PATH} must be greater than 0",
};

// Céntimos: como mucho dos decimales (con margen para el redondeo de coma flotante)
export const twoDecimals = {
  validator: (value) => Math.abs(Math.round(value * 100) - value * 100) < 1e-9,
  message: "{PATH} must have at most 2 decimals",
};
