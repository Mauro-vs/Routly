const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Una fecha ISO de la API ("2026-11-08T08:00:00.000Z") como valor de un
 * `<input type="datetime-local">` ("2026-11-08T09:00"), en la hora local de quien
 * usa el panel.
 */
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Lo contrario: el valor del input, en hora local, como fecha ISO en UTC para la API. */
export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

/** Las dos fechas ISO son el mismo instante, aunque estén escritas distinto. */
export function sameInstant(a: string, b: string | undefined): boolean {
  return b !== undefined && new Date(a).getTime() === new Date(b).getTime();
}
