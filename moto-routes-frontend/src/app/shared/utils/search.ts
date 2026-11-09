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
