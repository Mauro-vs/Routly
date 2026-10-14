import { IconName } from '../../shared/components/icon/icons.generated';

export interface NavAction {
  label: string;
  path: string;
}

export interface NavItem {
  /** Identificador de la sección. Es el que usa NavBadgeService para el contador. */
  id: string;
  label: string;
  icon: IconName;
  path: string;
  /** Solo se marca como activa con la URL exacta. Para la portada. */
  exact?: boolean;
  /** `id` de la sección de la que cuelga. Se pinta sangrada y sale en las migas. */
  parent?: string;
  /** Acción de crear, que aparece en la barra superior. */
  create?: NavAction;
}

export interface UpcomingItem {
  label: string;
  icon: IconName;
}

/**
 * Secciones del panel. Para añadir una entidad: muévela aquí desde UPCOMING_ITEMS
 * con su `path` (y `create`), y registra su ruta en app.routes.ts.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'overview', label: 'Resumen', icon: 'squares-four', path: '/', exact: true },
  {
    id: 'routes',
    label: 'Rutas',
    icon: 'path',
    path: '/routes',
    create: { label: 'Nueva ruta', path: '/routes/new' },
  },
  { id: 'routes-trash', label: 'Papelera', icon: 'trash', path: '/routes/trash', parent: 'routes' },
];

/** Entidades que todavía no existen en la API. Se muestran sin enlace. */
export const UPCOMING_ITEMS: readonly UpcomingItem[] = [
  { label: 'Experiencias', icon: 'compass' },
  { label: 'Salidas', icon: 'calendar-blank' },
  { label: 'Categorías', icon: 'tag' },
  { label: 'Ubicaciones', icon: 'map-pin' },
  { label: 'Anfitriones', icon: 'user-circle' },
  { label: 'Usuarios', icon: 'users' },
];

/**
 * Sección a la que pertenece una URL: la de `path` más largo que la contiene.
 * Así `/routes/trash` es "Papelera" y no "Rutas", aunque empiece igual.
 */
export function findSection(url: string): NavItem | null {
  let best: NavItem | null = null;

  for (const item of NAV_ITEMS) {
    const matches = item.exact
      ? url === item.path
      : url === item.path || url.startsWith(`${item.path}/`);
    if (matches && (!best || item.path.length > best.path.length)) best = item;
  }

  return best;
}

export function findParent(item: NavItem): NavItem | null {
  return NAV_ITEMS.find((candidate) => candidate.id === item.parent) ?? null;
}
