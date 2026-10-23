import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  template: `
    @if (failed()) {
      <div class="card">
        <ui-error-state [title]="errorTitle()" (retry)="retry.emit()" />
      </div>
    } @else if (record(); as record) {
      <header class="head">
        @if (thumbnail(); as thumbnail) {
          <img class="head__thumb" [src]="thumbnail" alt="" width="56" height="56" />
        }
        <div class="head__text">
          <h1>{{ title() }}</h1>
          <div class="head__meta">
            <ui-status-badge [status]="record.status" [gender]="labels().gender" />
            @if (subtitle()) {
              <span>{{ subtitle() }}</span>
            }
          </div>
        </div>
        @if (editPath(); as editPath) {
          <div class="head__actions">
            <a class="btn btn--primary" [routerLink]="editPath">
              <ui-icon name="pencil-simple" />Editar
            </a>
          </div>
        }
      </header>

      <div class="layout">
        <div class="layout__main">
          <ng-content />
        </div>

        <aside class="layout__aside" [attr.aria-label]="'Estado y datos ' + ofThe()">
          <section class="card panel" aria-labelledby="detail-state">
            <h2 id="detail-state">Estado</h2>
            <ui-status-toggle
              [active]="record.isActive"
              [label]="title()"
              [labels]="labels()"
              [busy]="busy()"
              [lockedReason]="toggleLockedReason()"
              (activeChange)="activeChange.emit($event)"
            />
            @if (toggleLockedReason(); as reason) {
              <p class="note"><ui-icon name="lock-simple" />{{ reason }}</p>
            } @else {
              <p class="hint">El cambio se guarda al momento.</p>
            }
          </section>

          <ng-content select="[detailAside]" />

          <section class="card panel" aria-labelledby="detail-record">
            <h2 id="detail-record">Registro</h2>
            <ui-field-list [items]="metaItems()" />
          </section>

          <section class="card panel danger" aria-labelledby="detail-delete">
            <h2 id="detail-delete">Eliminar</h2>
            <p class="hint">{{ deleteHint() }}</p>
            <ui-tip #tip [text]="deleteLockedReason()">
              <button
                type="button"
                class="btn btn--danger"
                [attr.aria-disabled]="deleteLockedReason() ? true : null"
                [attr.aria-describedby]="tip.describedBy()"
                [disabled]="busy()"
                (click)="onRemove()"
              >
                <ui-icon name="trash" />Eliminar {{ labels().singular }}
              </button>
            </ui-tip>
            @if (deleteLockedReason(); as reason) {
              <p class="note"><ui-icon name="lock-simple" />{{ reason }}</p>
            }
          </section>
        </aside>
      </div>
    } @else {
      <div class="head" aria-busy="true" [attr.aria-label]="'Cargando ' + ofThe()">
        <div class="head__text">
          <ui-skeleton width="320px" height="30px" />
          <ui-skeleton class="skeleton-gap" width="140px" height="22px" radius="999px" />
        </div>
      </div>
      <div class="layout" aria-hidden="true">
        <div class="layout__main">
          <div class="card panel"><ui-skeleton height="18px" width="40%" /><ui-skeleton class="skeleton-gap" height="64px" /></div>
          <div class="card panel"><ui-skeleton height="18px" width="30%" /><ui-skeleton class="skeleton-gap" height="96px" /></div>
        </div>
        <div class="layout__aside">
          <div class="card panel"><ui-skeleton height="18px" width="50%" /><ui-skeleton class="skeleton-gap" height="40px" /></div>
          <div class="card panel"><ui-skeleton height="18px" width="50%" /><ui-skeleton class="skeleton-gap" height="120px" /></div>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .head {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: 20px;
    }

    .head__thumb {
      flex: none;
      width: 56px;
      height: 56px;
      border-radius: var(--radius-md);
      object-fit: cover;
      background: var(--color-surface-2);
    }

    .head__text {
      flex: 1;
      min-width: 0;
    }

    h1 {
      overflow-wrap: anywhere;
    }

    .head__meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-3);
      margin-top: 6px;
      color: var(--color-text-muted);
    }

    .head__actions {
      display: flex;
      gap: var(--space-2);
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      align-items: start;
      gap: var(--space-4);
    }

    .layout__main,
    .layout__aside {
      display: grid;
      gap: var(--space-4);
      min-width: 0;
    }

    .panel > h2 {
      margin-bottom: var(--space-3);
    }

    .hint {
      margin-top: var(--space-2);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .danger .hint {
      margin: 0 0 var(--space-3);
    }

    .note {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-top: var(--space-3);
      font-size: var(--text-xs);
      font-weight: 500;
      color: var(--color-text-muted);
    }

    .note ui-icon {
      flex: none;
      margin-top: 2px;
      font-size: 14px;
    }

    .skeleton-gap {
      display: block;
      margin-top: var(--space-3);
    }

    @media (max-width: 1080px) {
      .layout {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    @media (max-width: 560px) {
      .head {
        flex-wrap: wrap;
      }

      .head__actions,
      .head__actions .btn {
        flex: 1;
      }
    }
  `,
})
export class DetailPageComponent {
  readonly title = input.required<string>();
  /** Línea junto a la insignia de estado, por ejemplo "Palma a Sóller". */
  readonly subtitle = input('');
  readonly labels = input.required<CollectionLabels>();
  /** null mientras carga: se pinta el esqueleto. */
  readonly record = input.required<BaseRecord | null>();
  /** La carga ha fallado: se muestra el error con "Reintentar". */
  readonly failed = input(false);
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
