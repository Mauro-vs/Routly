import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { LoadFailure, failureError } from '../../../core/models/api-error.model';

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
  templateUrl: './form-page.component.html',
  styleUrl: './form-page.component.css',
})
export class FormPageComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input('');
  readonly labels = input.required<CollectionLabels>();
  readonly isEdit = input(false);
  /** Al editar, el registro aún no ha llegado. */
  readonly loading = input(false);
  /** La carga del registro ha fallado (un 404 ya vuelve solo al listado). */
  /** El error de la carga (o solo si ha fallado): el recuadro de error cuenta el motivo. */
  readonly failed = input<LoadFailure>(false);
  protected readonly loadError = computed(() => failureError(this.failed()));
  readonly saving = input(false);
  readonly cancelPath = input.required<RouterPath>();
  /** Estado del interruptor: el del registro, o el que tendrá al crearlo. */
  readonly active = input(true);
  /** Por qué no se puede activar o desactivar. null: se puede. */
  readonly lockedReason = input<string | null>(null);
  /** La colección tiene galería: al crear se explica cuándo se añaden las imágenes. */
  readonly ownsImages = input(false, { transform: booleanAttribute });

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
  protected readonly imagesNote = computed(
    () => `Las imágenes se añaden después de crear ${this.ofThe()}, desde su detalle o al editar.`,
  );
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
