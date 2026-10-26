const madridDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Fecha en hora de Madrid, no en UTC: { year: "2026", month: "11", day: "08" }.
// La usan el SKU y el slug de las salidas.
export function madridDateParts(date) {
  return Object.fromEntries(madridDate.formatToParts(date).map(({ type, value }) => [type, value]));
}
