import { EntityStatus } from '../../core/models/entity.model';

export type Gender = 'f' | 'm';

/**
 * Cómo se nombra una colección en los textos del panel. Con el género se
 * conciertan "activa" o "activo", "Nueva" o "Nuevo"...
 *
 *   { singular: 'ruta', plural: 'rutas', gender: 'f' }
 */
export interface CollectionLabels {
  /** En minúscula, como va en mitad de una frase. */
  singular: string;
  plural: string;
  gender: Gender;
}

/** Elige la forma femenina o la masculina de una palabra. */
export function agree(gender: Gender, feminine: string, masculine: string): string {
  return gender === 'f' ? feminine : masculine;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Los estados de un registro y, para los textos, «eliminada» (que no es un estado). */
type StatusWord = EntityStatus | 'deleted';

const STATUS_WORDS: Record<StatusWord, [feminine: string, masculine: string]> = {
  active: ['activa', 'activo'],
  inactive: ['inactiva', 'inactivo'],
  deleted: ['eliminada', 'eliminado'],
};

/** "activa", "inactivo"... en minúscula. */
export function statusWord(status: StatusWord, gender: Gender): string {
  const [feminine, masculine] = STATUS_WORDS[status];
  return agree(gender, feminine, masculine);
}

/** "1 ruta" o "5 rutas". */
export function countLabel(count: number, labels: CollectionLabels): string {
  return `${count} ${count === 1 ? labels.singular : labels.plural}`;
}

/** "Nueva ruta" o "Nuevo usuario": el botón de crear. */
export function newLabel(labels: CollectionLabels): string {
  return `${agree(labels.gender, 'Nueva', 'Nuevo')} ${labels.singular}`;
}

/** "Todas", "Activas", "Inactivas" (o en masculino): el filtro por estado. */
export function statusFilterLabels(gender: Gender): Record<'all' | 'active' | 'inactive', string> {
  return {
    all: agree(gender, 'Todas', 'Todos'),
    active: capitalize(`${statusWord('active', gender)}s`),
    inactive: capitalize(`${statusWord('inactive', gender)}s`),
  };
}
