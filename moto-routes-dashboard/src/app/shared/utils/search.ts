/**
 * Una forma de ordenar un listado: lo que se ve en el selector y el `sort` que se envía a la
 * API (`-distance`, `brand,model`...). Sin `sort`, el orden por defecto de la API.
 */
export interface ListSort {
  /** Lo que va en la URL del panel (`?orden=km`). */
  value: string;
  label: string;
  sort?: string;
}

/** Una opción de un filtro del listado. */
export interface FilterOption {
  /** Lo que va en la URL del panel. */
  value: string;
  label: string;
}

/**
 * Un filtro propio de un listado: un desplegable junto al filtro por estado.
 *
 *   { param: 'dificultad', label: 'Dificultad', allLabel: 'Todas las dificultades',
 *     options: () => [...], toApi: (value) => ({ difficulty: value }) }
 */
export interface ListFilter {
  /** Su nombre en la URL del panel (`?dificultad=hard`). */
  param: string;
  /** El nombre accesible del desplegable. */
  label: string;
  /** La opción sin filtrar. */
  allLabel: string;
  /** Las opciones. Puede leer signals: las categorías llegan de la API. */
  options: () => readonly FilterOption[];
  /** Los query params de la API para un valor elegido. */
  toApi: (value: string) => Readonly<Record<string, string>>;
}
