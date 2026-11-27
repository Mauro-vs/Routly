import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LoadFailure, failureError } from '../../../core/models/api-error.model';
import { BaseRecord } from '../../../core/models/entity.model';
import { CollectionLabels, agree, capitalize } from '../../utils/labels';
import { RouterPath } from '../../utils/router';
import { ErrorStateComponent } from '../error-state/error-state.component';
import { FieldItem, FieldListComponent } from '../field-list/field-list.component';
import { IconComponent } from '../icon/icon.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { StatusToggleComponent } from '../status-toggle/status-toggle.component';
import { TipComponent } from '../tip/tip.component';

/** El identificador legible del registro: su slug, o el SKU de una salida. */
export interface DetailIdentifier {
  label: string;
  value: string;
}

/**
 * Marco común de las páginas de detalle. A la izquierda, las secciones que pone
 * cada página (`ui-detail-section`). A la derecha, lo que es igual en todas: el
 * estado con su interruptor, los datos del registro (fechas, slug e id) y, aparte,
 * la acción de eliminar.
 *
 *   <ui-detail-page [title]="ruta.title" [labels]="labels" [record]="ruta" ...>
 *     <ui-detail-section heading="Recorrido">…</ui-detail-section>
 *     <div detailAside>…</div>
 *   </ui-detail-page>
 */
@Component({
  selector: 'ui-detail-page',
  imports: [
    RouterLink,
    ErrorStateComponent,
    FieldListComponent,
    IconComponent,
    SkeletonComponent,
    StatusBadgeComponent,
    StatusToggleComponent,
    TipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail-page.component.html',
  styleUrl: './detail-page.component.css',
})
export class DetailPageComponent {
  readonly title = input.required<string>();
  /** Línea junto a la insignia de estado, por ejemplo "Palma a Sóller". */
  readonly subtitle = input('');
  readonly labels = input.required<CollectionLabels>();
  /** null mientras carga: se pinta el esqueleto. */
  readonly record = input.required<BaseRecord | null>();
  /** La carga ha fallado: se muestra el error con "Reintentar". */
  /** El error de la carga (o solo si ha fallado): el recuadro de error cuenta el motivo. */
  readonly failed = input<LoadFailure>(false);
  protected readonly loadError = computed(() => failureError(this.failed()));
  readonly identifier = input<DetailIdentifier | null>(null);
  /** Imagen principal, si el registro tiene. */
  readonly thumbnail = input<string | null>(null);
  readonly editPath = input<RouterPath | null>(null);
  readonly busy = input(false);
  /** Por qué no se puede activar o desactivar. null: se puede. */
  readonly toggleLockedReason = input<string | null>(null);
  /** Por qué no se puede eliminar. null: se puede. */
  readonly deleteLockedReason = input<string | null>(null);

  readonly activeChange = output<boolean>();
  readonly remove = output<void>();
  readonly retry = output<void>();

  /** "de la ruta" o "del usuario". */
  protected readonly ofThe = computed(() => {
    const { singular, gender } = this.labels();
    return `${agree(gender, 'de la', 'del')} ${singular}`;
  });
  protected readonly deleteHint = computed(
    () => `Pasa a la papelera. Podrás restaurar${agree(this.labels().gender, 'la', 'lo')} después.`,
  );
  protected readonly errorTitle = computed(
    () => `No se ha podido cargar ${agree(this.labels().gender, 'la', 'el')} ${this.labels().singular}`,
  );

  protected readonly metaItems = computed<FieldItem[]>(() => {
    const record = this.record();
    if (!record) return [];

    const identifier = this.identifier();
    return [
      { label: capitalize(agree(this.labels().gender, 'creada', 'creado')), value: record.createdAt, format: 'datetime' },
      { label: 'Última modificación', value: record.updatedAt, format: 'relative' },
      ...(identifier ? [{ label: identifier.label, value: identifier.value, format: 'mono' as const }] : []),
      { label: 'Id', value: record._id, format: 'mono' },
    ];
  });

  protected onRemove(): void {
    if (this.deleteLockedReason()) return;
    this.remove.emit();
  }
}
