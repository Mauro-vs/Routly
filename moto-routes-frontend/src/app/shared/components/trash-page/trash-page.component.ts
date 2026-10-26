import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CollectionLabels, agree, capitalize, countLabel, statusWord } from '../../utils/labels';
import { RouterPath } from '../../utils/router';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ErrorStateComponent } from '../error-state/error-state.component';
import { IconComponent } from '../icon/icon.component';
import { PageHeaderComponent } from '../page-header/page-header.component';
import { SegmentOption, SegmentedComponent } from '../segmented/segmented.component';

/** Cómo vuelve un registro: con el estado que tenía al eliminarlo, inactivo o activo. */
export type RestoreAs = 'previous' | 'inactive' | 'active';

/**
 * Marco común de las papeleras: los registros eliminados (borrado lógico), que se
 * pueden restaurar como estaban, activos o inactivos. La tabla la pone cada página
 * dentro, con un `ui-restore-button` en cada fila.
 *
 *   <ui-trash-page [labels]="labels" backPath="/routes" ... [(restoreAs)]="restoreAs">
 *     <ui-data-table ... />
 *   </ui-trash-page>
 */
@Component({
  selector: 'ui-trash-page',
  imports: [
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    PageHeaderComponent,
    SegmentedComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Papelera" [subtitle]="subtitle()">
      <a class="btn btn--secondary" [routerLink]="backPath()">
        <ui-icon name="arrow-left" />Volver a {{ labels().plural }}
      </a>
    </ui-page-header>

    @if (failed()) {
      <div class="card">
        <ui-error-state title="No se ha podido cargar la papelera" (retry)="retry.emit()" />
      </div>
    } @else if (loaded() && total() === 0) {
      <div class="card">
        <ui-empty-state icon="trash" title="La papelera está vacía" [description]="emptyText()">
          <a class="btn btn--secondary" [routerLink]="backPath()">Ir a {{ labels().plural }}</a>
        </ui-empty-state>
      </div>
    } @else {
      <div class="toolbar">
        <ng-content select="[trashToolbar]" />
        <div class="toolbar__end">
          <span class="toolbar__label" aria-hidden="true">Al restaurar, {{ leaveAs() }}</span>
          <ui-segmented
            [label]="restoreLabel()"
            [options]="restoreOptions()"
            [value]="restoreAs()"
            (valueChange)="restoreAs.set($event)"
          />
        </div>
      </div>
      <ng-content />
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .toolbar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: var(--space-4);
    }

    .toolbar__end {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-left: auto;
    }

    .toolbar__label {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    @media (max-width: 900px) {
      .toolbar__end {
        margin-left: 0;
      }
    }
  `,
})
export class TrashPageComponent {
  readonly labels = input.required<CollectionLabels>();
  readonly backPath = input.required<RouterPath>();
  /** La primera carga ha terminado. Hasta entonces no se juzga si está vacía. */
  readonly loaded = input.required<boolean>();
  readonly failed = input(false);
  /** Cuántos registros hay en la papelera. */
  readonly total = input.required<number>();

  /** Cómo vuelve un registro al restaurarlo. Por defecto, como estaba al eliminarlo. */
  readonly restoreAs = model<RestoreAs>('previous');
  readonly retry = output<void>();

  protected readonly subtitle = computed(() => {
    if (!this.loaded()) return 'Cargando la papelera…';
    const { plural, gender } = this.labels();
    const total = this.total();
    if (total === 0) return `Aquí aparecen ${agree(gender, 'las', 'los')} ${plural} que eliminas.`;

    const pronoun = agree(gender, 'la', 'lo') + (total === 1 ? '' : 's');
    const deleted = statusWord('deleted', gender) + (total === 1 ? '' : 's');
    return `${countLabel(total, this.labels())} ${deleted}. Puedes restaurar${pronoun} cuando quieras.`;
  });

  protected readonly emptyText = computed(() => {
    const { plural, gender } = this.labels();
    return `${capitalize(agree(gender, 'las', 'los'))} ${plural} que elimines aparecerán aquí y podrás restaurar${agree(gender, 'las', 'los')}.`;
  });

  protected readonly leaveAs = computed(() => `dejar${agree(this.labels().gender, 'la', 'lo')}`);
  protected readonly restoreLabel = computed(() => {
    const { singular, gender } = this.labels();
    return `Estado ${agree(gender, 'de la', 'del')} ${singular} al restaurar${agree(gender, 'la', 'lo')}`;
  });
  protected readonly restoreOptions = computed<SegmentOption<RestoreAs>[]>(() => {
    const { gender } = this.labels();
    return [
      { value: 'previous', label: 'Como estaba' },
      { value: 'inactive', label: capitalize(statusWord('inactive', gender)) },
      { value: 'active', label: capitalize(statusWord('active', gender)) },
    ];
  });
}
