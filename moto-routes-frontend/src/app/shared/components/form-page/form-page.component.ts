import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ENTITY_FORM_ID } from '../../forms/entity-form';
import { CollectionLabels, agree, capitalize, statusWord } from '../../utils/labels';
import { RouterPath } from '../../utils/router';
import { ErrorStateComponent } from '../error-state/error-state.component';
import { IconComponent } from '../icon/icon.component';
import { PageHeaderComponent } from '../page-header/page-header.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { TipComponent } from '../tip/tip.component';
import { ToggleComponent } from '../toggle/toggle.component';

/**
 * Marco común de las páginas de crear y editar: cabecera con "Cancelar" y "Guardar",
 * los estados de carga y de error, y al lado el interruptor de activo (al crear se
 * aplica al guardar; al editar, al momento). El formulario lo pone cada página:
 *
 *   <ui-form-page [heading]="..." [labels]="labels" ...>
 *     <app-category-form [record]="record()" (save)="save($event)" />
 *   </ui-form-page>
 *
 * Con `[formAside]` se añade algo debajo del interruptor.
 */
@Component({
  selector: 'ui-form-page',
  imports: [
    RouterLink,
    ErrorStateComponent,
    IconComponent,
    PageHeaderComponent,
    SkeletonComponent,
    TipComponent,
    ToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header [title]="heading()" [subtitle]="subtitleText()">
      <a class="btn btn--secondary" [routerLink]="cancelPath()">Cancelar</a>
      <button
        type="submit"
        class="btn btn--primary"
        [attr.form]="formId"
        [disabled]="saving() || loading() || failed()"
      >
        @if (saving()) {
          <span class="spinner" aria-hidden="true"></span>Guardando…
        } @else {
          <ui-icon name="check" />{{ submitLabel() }}
        }
      </button>
    </ui-page-header>

    @if (failed()) {
      <div class="card">
        <ui-error-state [title]="errorTitle()" (retry)="retry.emit()" />
      </div>
    } @else if (loading()) {
      <div class="layout" aria-busy="true" [attr.aria-label]="'Cargando ' + ofThe()">
        <div class="card panel skeleton-fields">
          @for (field of skeletonFields; track $index) {
            <div class="skeleton-field">
              <ui-skeleton [width]="field" height="14px" />
              <ui-skeleton height="38px" radius="var(--radius-md)" />
            </div>
          }
        </div>
        <div class="card panel"><ui-skeleton width="70%" height="22px" /></div>
      </div>
    }

    <!-- El formulario se queda creado mientras carga: así no pierde su estado. -->
    <div class="layout" [hidden]="loading() || failed()">
      <div class="layout__main"><ng-content /></div>

      <div class="stack">
        <div class="card panel toggle-row">
          <div>
            <strong id="form-active-label">{{ activeLabel() }}</strong>
            <span class="muted">{{ activeHint() }}</span>
          </div>
          <ui-tip #tip [text]="lockedReason()">
            <ui-toggle
              labelledBy="form-active-label"
              [checked]="active()"
              [locked]="!!lockedReason()"
              [describedBy]="tip.describedBy()"
              (checkedChange)="activeChange.emit($event)"
            />
          </ui-tip>
        </div>
        <ng-content select="[formAside]" />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      align-items: start;
      gap: var(--space-4);
    }

    .layout__main {
      min-width: 0;
    }

    .stack,
    .skeleton-fields {
      display: grid;
      gap: var(--space-4);
    }

    .skeleton-field {
      display: grid;
      gap: 8px;
    }

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
    }

    .toggle-row strong {
      display: block;
      font-weight: 600;
    }

    .toggle-row span {
      font-size: var(--text-xs);
    }

    @media (max-width: 1080px) {
      .layout {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class FormPageComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input('');
  readonly labels = input.required<CollectionLabels>();
  readonly isEdit = input(false);
  /** Al editar, el registro aún no ha llegado. */
  readonly loading = input(false);
  /** La carga del registro ha fallado (un 404 ya vuelve solo al listado). */
  readonly failed = input(false);
  readonly saving = input(false);
  readonly cancelPath = input.required<RouterPath>();
  /** Estado del interruptor: el del registro, o el que tendrá al crearlo. */
  readonly active = input(true);
  /** Por qué no se puede activar o desactivar. null: se puede. */
  readonly lockedReason = input<string | null>(null);

  readonly activeChange = output<boolean>();
  readonly retry = output<void>();

  protected readonly formId = ENTITY_FORM_ID;
  protected readonly skeletonFields = ['60px', '90px', '70px', '80px'];

  protected readonly ofThe = computed(() => {
    const { singular, gender } = this.labels();
    return `${agree(gender, 'la', 'el')} ${singular}`;
  });
  protected readonly subtitleText = computed(() => {
    if (this.subtitle()) return this.subtitle();
    const { singular, gender } = this.labels();
    return this.isEdit()
      ? `Editar ${singular}`
      : `Rellena los datos ${agree(gender, 'de la nueva', 'del nuevo')} ${singular}.`;
  });
  protected readonly submitLabel = computed(() =>
    this.isEdit() ? 'Guardar cambios' : `Crear ${this.labels().singular}`,
  );
  protected readonly errorTitle = computed(() => `No se ha podido cargar ${this.ofThe()}`);
  protected readonly activeLabel = computed(() => {
    const { singular, gender } = this.labels();
    return `${capitalize(singular)} ${statusWord('active', gender)}`;
  });
  protected readonly activeHint = computed(() =>
    this.isEdit()
      ? 'El cambio se guarda al momento.'
      : `Se aplica al crear ${this.ofThe()}.`,
  );
}
