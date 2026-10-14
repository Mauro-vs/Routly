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
  template: `
    <label class="field__label" [attr.for]="controlId">
      {{ label() }}
      @if (optional()) {
        <span class="field__optional">(opcional)</span>
      }
    </label>
    <ng-content />
    <div class="field__message" aria-live="polite">
      @if (error(); as message) {
        <p class="field__error" [id]="messageId"><ui-icon name="warning-circle" />{{ message }}</p>
      } @else if (hint() || counter()) {
        <p class="field__hint" [id]="messageId">
          <span>{{ hint() }}</span>
          @if (counter()) {
            <span class="num">{{ counter() }}</span>
          }
        </p>
      }
    </div>
  `,
  styles: `
    :host {
      display: grid;
      align-content: start;
      gap: 6px;
      min-width: 0;
    }

    .field__label {
      font-size: var(--text-sm);
      font-weight: 600;
    }

    .field__optional {
      font-weight: 400;
      color: var(--color-text-muted);
    }

    .field__message:empty {
      display: none;
    }

    .field__hint,
    .field__error {
      font-size: var(--text-xs);
    }

    .field__hint {
      display: flex;
      justify-content: space-between;
      gap: var(--space-3);
      color: var(--color-text-muted);
    }

    .field__error {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      color: var(--color-danger);
    }

    .field__error ui-icon {
      font-size: 15px;
    }
  `,
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
