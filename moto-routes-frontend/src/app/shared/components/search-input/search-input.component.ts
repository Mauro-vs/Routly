import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/** Campo de búsqueda para filtrar un listado mientras se escribe. */
@Component({
  selector: 'ui-search-input',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="search">
      <span class="sr-only">{{ label() }}</span>
      <ui-icon name="magnifying-glass" />
      <input
        #box
        class="input"
        type="search"
        name="search"
        autocomplete="off"
        spellcheck="false"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="value.set(box.value)"
      />
    </label>
  `,
  styles: `
    :host {
      display: block;
    }

    .search {
      position: relative;
      display: block;
    }

    ui-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 17px;
      color: var(--color-text-muted);
      pointer-events: none;
    }

    .input {
      padding-left: 36px;
    }
  `,
})
export class SearchInputComponent {
  readonly value = model('');
  /** Nombre accesible del campo. */
  readonly label = input.required<string>();
  readonly placeholder = input('');
}
