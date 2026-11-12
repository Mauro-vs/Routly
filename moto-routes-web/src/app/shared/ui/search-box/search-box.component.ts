import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/** Lo que se espera desde la última tecla antes de buscar. Es la única espera: el store no espera. */
export const SEARCH_DEBOUNCE_MS = 300;

let nextId = 0;

/**
 * Campo de búsqueda con espera (debounce), Enter para buscar ya y un botón de borrar. No sabe qué
 * se busca: emite el texto, sin espacios de más, y solo cuando cambia. El valor que llega de
 * fuera (`value`, el de la URL) se enseña y no se vuelve a emitir.
 */
@Component({
  selector: 'ui-search-box',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [for]="id" class="sr-only">{{ label() }}</label>
    <div class="field">
      <ui-icon name="magnifying-glass" class="lens" />
      <input
        #field
        [id]="id"
        type="search"
        enterkeyhint="search"
        autocomplete="off"
        [placeholder]="placeholder()"
        [value]="text()"
        [attr.aria-describedby]="hint() ? id + '-hint' : null"
        (input)="onInput(field.value)"
        (keydown.enter)="flush($event)"
      />
      @if (text()) {
        <button type="button" class="clear" aria-label="Borrar la búsqueda" (click)="clearField()">
          <ui-icon name="x" />
        </button>
      }
    </div>
    @if (hint()) {
      <p class="hint" [id]="id + '-hint'">{{ hint() }}</p>
    }
  `,
  styles: `
    :host {
      display: grid;
      /* minmax(0, ...): que el campo encoja con su columna, no al ancho del texto de ayuda */
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-1);
      min-width: 0;
    }

    .field {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      height: 48px;
      padding: 0 var(--space-2) 0 var(--space-4);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      transition: border-color var(--motion-fast);
    }

    .field:focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 1px var(--color-primary);
    }

    .lens {
      font-size: 18px;
      color: var(--color-text-muted);
    }

    input {
      flex: 1;
      min-width: 0;
      height: 100%;
      border: 0;
      background: none;
      outline: none;
      /* 16 px: en el móvil, un campo más pequeño hace zoom al enfocarlo */
      font-size: 16px;
    }

    input::placeholder {
      color: var(--color-text-muted);
    }

    input::-webkit-search-cancel-button {
      display: none;
    }

    .clear {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: var(--radius-sm);
      background: none;
      color: var(--color-text-muted);
      font-size: 16px;
      cursor: pointer;
    }

    .clear:hover {
      background: var(--color-surface-2);
      color: var(--color-text);
    }

    .hint {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
  `,
})
export class SearchBoxComponent {
  /** Para el lector de pantalla: el campo no tiene etiqueta visible */
  readonly label = input.required<string>();
  readonly placeholder = input('');
  /** Cómo se busca (palabras enteras...), debajo del campo y unido a él */
  readonly hint = input<string | null>(null);
  /** El texto que viene de fuera (la URL) */
  readonly value = input('');
  readonly search = output<string>();

  protected readonly id = `search-${nextId++}`;
  protected readonly text = signal('');
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private timer: ReturnType<typeof setTimeout> | undefined;
  // Lo último que se sabe que vale la búsqueda: lo emitido o lo que llegó de fuera
  private current = '';

  constructor() {
    effect(() => {
      const value = this.value();
      this.current = value.trim();
      this.text.set(value);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected onInput(value: string): void {
    this.text.set(value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.emit(value), SEARCH_DEBOUNCE_MS);
  }

  protected flush(event: Event): void {
    event.preventDefault();
    clearTimeout(this.timer);
    this.emit(this.text());
  }

  protected clearField(): void {
    clearTimeout(this.timer);
    this.text.set('');
    this.emit('');
    this.field().nativeElement.focus();
  }

  private emit(value: string): void {
    const trimmed = value.trim();
    if (trimmed === this.current) return;
    this.current = trimmed;
    this.search.emit(trimmed);
  }
}
