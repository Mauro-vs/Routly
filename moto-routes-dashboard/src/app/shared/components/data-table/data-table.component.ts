import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  TemplateRef,
  computed,
  contentChildren,
  inject,
  input,
} from '@angular/core';

import { SkeletonComponent } from '../skeleton/skeleton.component';

export interface TableColumn {
  /** Identificador de la columna. Es el nombre que usa `uiCell` para su celda. */
  key: string;
  header: string;
  align?: 'start' | 'end';
  /** La cabecera solo se lee con lector de pantalla (por ejemplo, "Acciones"). */
  headerHidden?: boolean;
  /** En móvil la celda ocupa todo el ancho de la fila. */
  wide?: boolean;
  /** En móvil no se antepone el nombre de la columna al valor. */
  plain?: boolean;
}

/**
 * Plantilla de una celda. `uiCellOf` solo sirve para que la plantilla conozca el
 * tipo de cada fila.
 *
 *   <ng-template uiCell="title" [uiCellOf]="rutas()" let-ruta>{{ ruta.title }}</ng-template>
 */
@Directive({ selector: 'ng-template[uiCell]' })
export class TableCellDirective<T> {
  readonly name = input.required<string>({ alias: 'uiCell' });
  readonly uiCellOf = input<readonly T[]>();
  readonly template = inject<TemplateRef<{ $implicit: T }>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _directive: TableCellDirective<T>,
    _context: unknown,
  ): _context is { $implicit: T } {
    return true;
  }
}

/**
 * Tabla de un listado. Las columnas se declaran con `columns` y el contenido de
 * cada celda con plantillas `uiCell`. En móvil cada fila pasa a ser un bloque
 * apilado, y mientras `loading` es true pinta filas de espera con la misma forma.
 */
@Component({
  selector: 'ui-data-table',
  imports: [NgTemplateOutlet, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.css',
})
export class DataTableComponent<T> {
  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<readonly TableColumn[]>();
  /** Descripción de la tabla para lectores de pantalla. */
  readonly caption = input.required<string>();
  /** Clave estable de cada fila, por ejemplo `(ruta) => ruta._id`. */
  readonly rowKey = input.required<(row: T) => string>();
  /** Filas que se pintan atenuadas, por ejemplo las inactivas. */
  readonly mutedWhen = input<(row: T) => boolean>(() => false);
  readonly loading = input(false);
  readonly skeletonRows = input(5);

  private readonly cells = contentChildren<TableCellDirective<T>>(TableCellDirective);
  private readonly templates = computed(
    () => new Map(this.cells().map((cell) => [cell.name(), cell.template])),
  );
  protected readonly placeholders = computed(() =>
    Array.from({ length: this.skeletonRows() }, (_, index) => index),
  );

  protected templateFor(key: string): TemplateRef<{ $implicit: T }> | null {
    return this.templates().get(key) ?? null;
  }
}
