import { IconName } from '../../shared/components/icon/icons.generated';

export interface NavAction {
  label: string;
  path: string;
}

interface NavItem {
  /**
   * Identificador de la sección. En las colecciones es su ruta en la API (`routes`,
   * `users`...): con él se pide y se publica su contador en NavBadgeService.
   */
  id: string;
  label: string;
  icon: IconName;
  path: string;
  /** Solo se marca como activa con la URL exacta. Para la portada. */
  exact?: boolean;
  /** Acción de crear, que aparece en la barra superior. */
  create?: NavAction;
  /** Todavía no tiene páginas: se muestra sin enlace, como "próximamente". */
  pending?: boolean;
}

interface NavGroup {
  label: string;
  items: readonly NavItem[];
}

export const NAV_HOME: NavItem = {
  id: 'overview',
  label: 'Resumen',
  icon: 'squares-four',
  path: '/',
  exact: true,
};

/**
 * Colecciones del panel, agrupadas. Para dar de alta las páginas de una: registra su
 * ruta en app.routes.ts y quita su `pending`.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Catálogo',
    items: [
      {
        id: 'routes',
        label: 'Rutas',
        icon: 'path',
        path: '/routes',
        create: { label: 'Nueva ruta', path: '/routes/new' },
      },
      {
        id: 'categories',
        label: 'Categorías',
        icon: 'tag',
        path: '/categories',
        create: { label: 'Nueva categoría', path: '/categories/new' },
      },
      {
        id: 'locations',
        label: 'Ubicaciones',
        icon: 'map-pin',
        path: '/locations',
        create: { label: 'Nueva ubicación', path: '/locations/new' },
      },
    ],
  },
  {
    label: 'Experiencias',
    items: [
      {
        id: 'experiences',
        label: 'Experiencias',
        icon: 'compass',
        path: '/experiences',
        create: { label: 'Nueva experiencia', path: '/experiences/new' },
      },
      {
        id: 'departures',
        label: 'Salidas',
        icon: 'calendar-blank',
        path: '/departures',
        create: { label: 'Nueva salida', path: '/departures/new' },
      },
    ],
  },
  {
    label: 'Comunidad',
    items: [
      {
        id: 'users',
        label: 'Usuarios',
        icon: 'users',
        path: '/users',
        create: { label: 'Nuevo usuario', path: '/users/new' },
      },
      {
        id: 'hosts',
        label: 'Anfitriones',
        icon: 'user-circle',
        path: '/hosts',
        create: { label: 'Nuevo anfitrión', path: '/hosts/new' },
      },
      {
        id: 'roles',
        label: 'Roles',
        icon: 'shield-check',
        path: '/roles',
        create: { label: 'Nuevo rol', path: '/roles/new' },
      },
    ],
  },
  {
    label: 'Contenido',
    // Las imágenes se crean desde la galería de su dueño: no hay "Nueva imagen".
    items: [{ id: 'images', label: 'Imágenes', icon: 'images', path: '/images' }],
  },
];

/** Todas las secciones, en el orden del menú. */
const NAV_ITEMS: readonly NavItem[] = [NAV_HOME, ...NAV_GROUPS.flatMap((group) => group.items)];

/** Las colecciones, que llevan contador en el menú. */
export const COLLECTION_IDS: readonly string[] = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => item.id),
);

/**
 * Sección a la que pertenece una URL: la de `path` más largo que la contiene.
 * Así `/routes/trash` y `/routes/:slug/edit` son de "Rutas". Las secciones sin
 * páginas todavía no cuentan.
 */
export function findSection(url: string): NavItem | null {
  let best: NavItem | null = null;

  for (const item of NAV_ITEMS) {
    if (item.pending) continue;
    const matches = item.exact
      ? url === item.path
      : url === item.path || url.startsWith(`${item.path}/`);
    if (matches && (!best || item.path.length > best.path.length)) best = item;
  }

  return best;
}
