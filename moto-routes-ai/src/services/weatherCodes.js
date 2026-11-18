// Los códigos del tiempo de la OMM (WMO) que usa Open-Meteo, en español y con un icono para la web.
// https://open-meteo.com/en/docs (sección "WMO Weather interpretation codes")

const CODES = new Map([
  [0, ["Despejado", "sun"]],
  [1, ["Casi despejado", "sun"]],
  [2, ["Parcialmente nublado", "cloud-sun"]],
  [3, ["Nublado", "cloud"]],
  [45, ["Niebla", "fog"]],
  [48, ["Niebla con escarcha", "fog"]],
  [51, ["Llovizna débil", "drizzle"]],
  [53, ["Llovizna", "drizzle"]],
  [55, ["Llovizna intensa", "drizzle"]],
  [56, ["Llovizna helada", "drizzle"]],
  [57, ["Llovizna helada intensa", "drizzle"]],
  [61, ["Lluvia débil", "rain"]],
  [63, ["Lluvia", "rain"]],
  [65, ["Lluvia fuerte", "rain"]],
  [66, ["Lluvia helada", "rain"]],
  [67, ["Lluvia helada fuerte", "rain"]],
  [71, ["Nieve débil", "snow"]],
  [73, ["Nieve", "snow"]],
  [75, ["Nieve fuerte", "snow"]],
  [77, ["Granos de nieve", "snow"]],
  [80, ["Chubascos débiles", "rain"]],
  [81, ["Chubascos", "rain"]],
  [82, ["Chubascos fuertes", "rain"]],
  [85, ["Chubascos de nieve", "snow"]],
  [86, ["Chubascos de nieve fuertes", "snow"]],
  [95, ["Tormenta", "storm"]],
  [96, ["Tormenta con granizo", "storm"]],
  [99, ["Tormenta con granizo fuerte", "storm"]],
]);

/** { label, icon } de un código, o "Sin datos" si no se conoce. */
export function describeWeather(code) {
  const [label, icon] = CODES.get(code) ?? ["Sin datos", "unknown"];
  return { label, icon };
}

/*
 * Avisos para ir en moto. Umbrales pensados para quien conduce: a 3 °C puede haber hielo en
 * sombra, a 50 km/h de viento la moto se mueve de verdad en un puerto.
 */
export const WARNING_LIMITS = Object.freeze({ rainChance: 60, precipitation: 5, cold: 3, heat: 35, wind: 50 });
const STORM_OR_SNOW = new Set(["storm", "snow"]);

/** Los avisos de un día: "rain", "cold", "heat", "wind" o "storm". */
export function warningsOf(day) {
  const warnings = [];
  const { icon } = describeWeather(day.code);
  if (STORM_OR_SNOW.has(icon)) warnings.push("storm");
  if ((day.rainChance ?? 0) >= WARNING_LIMITS.rainChance || (day.precipitation ?? 0) >= WARNING_LIMITS.precipitation) warnings.push("rain");
  if (day.min !== null && day.min <= WARNING_LIMITS.cold) warnings.push("cold");
  if (day.max !== null && day.max >= WARNING_LIMITS.heat) warnings.push("heat");
  if ((day.wind ?? 0) >= WARNING_LIMITS.wind) warnings.push("wind");
  return warnings;
}
