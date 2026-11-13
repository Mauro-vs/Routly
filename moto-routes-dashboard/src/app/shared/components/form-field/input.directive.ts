import { Directive, inject } from '@angular/core';

import { FormFieldComponent } from './form-field.component';

/**
 * Marca el control que va dentro de un `ui-form-field`. Le da el estilo de campo,
 * lo asocia a la etiqueta y anuncia el error o la ayuda a los lectores de pantalla.
 */
@Directive({
  selector: 'input[uiInput], textarea[uiInput], select[uiInput]',
  host: {
    class: 'input',
    '[attr.id]': 'field.controlId',
    '[attr.aria-invalid]': 'field.invalid() ? "true" : null',
    '[attr.aria-describedby]': 'field.describedBy()',
  },
})
export class InputDirective {
  protected readonly field = inject(FormFieldComponent);
}
