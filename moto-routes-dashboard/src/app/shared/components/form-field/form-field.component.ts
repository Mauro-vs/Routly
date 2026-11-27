import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

let nextId = 0;

/**
 * Envoltorio de un campo de formulario: etiqueta, control, ayuda y error en línea.
 * El control se proyecta dentro con la directiva `uiInput`, que lo enlaza con la
 * etiqueta y con el mensaje de error para los lectores de pantalla.
 *
 *   <ui-form-field label="Título" hint="Máximo 120 caracteres" [error]="errorOf('title')">
 *     <input uiInput formControlName="title" />
 *   </ui-form-field>
 */
@Component({
  selector: 'ui-form-field',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly hint = input('');
  /** Texto alineado a la derecha de la ayuda, por ejemplo "37 / 120". */
  readonly counter = input('');
  readonly error = input<string | null>(null);
  readonly optional = input(false);

  private readonly uid = nextId++;
  /** Lo usa `uiInput` como id del control. */
  readonly controlId = `field-${this.uid}`;
  protected readonly messageId = `field-${this.uid}-message`;

  readonly invalid = computed(() => !!this.error());
  readonly describedBy = computed(() =>
    this.error() || this.hint() || this.counter() ? this.messageId : null,
  );
}
