import { Gender, agree } from '../utils/labels';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Las opciones de un select de relación son las activas (la API no deja elegir una
 * inactiva). Si el registro que se edita ya usa una que se ha desactivado después,
 * se añade marcada "(inactiva)": la API la acepta mientras no se cambie.
 *
 * Mientras las opciones no han llegado no se marca: todavía no se sabe.
 */
export function withCurrent(
  options: readonly SelectOption[],
  current: SelectOption | null | undefined,
  loaded: boolean,
  gender: Gender,
): SelectOption[] {
  if (!current || options.some((option) => option.value === current.value)) return [...options];
  const label = loaded ? `${current.label} (${agree(gender, 'inactiva', 'inactivo')})` : current.label;
  return [...options, { ...current, label }];
}
