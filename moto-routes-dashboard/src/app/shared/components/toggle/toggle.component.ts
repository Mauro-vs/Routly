import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Interruptor de dos estados, pensado para `isActive`.
 *
 * Se puede usar de dos formas:
 * - Controlado, en listados: `[checked]="ruta.isActive" (checkedChange)="cambiar(ruta, $event)"`.
 *   No guarda estado propio, refleja siempre el valor que recibe. Así un cambio
 *   optimista que la API rechaza vuelve solo a su sitio.
 * - Dentro de un formulario reactivo, con `formControlName`.
 */
@Component({
  selector: 'ui-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ToggleComponent), multi: true },
  ],
  template: `
    <button
      type="button"
      class="switch"
      role="switch"
      [attr.aria-checked]="value()"
      [attr.aria-label]="label() || null"
      [attr.aria-labelledby]="labelledBy() || null"
      [attr.aria-describedby]="describedBy()"
      [attr.aria-disabled]="locked() || null"
      [class.is-locked]="locked()"
      [disabled]="isDisabled()"
      (click)="toggle()"
      (blur)="onTouched()"
    >
      <span class="switch__thumb"></span>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .switch {
      position: relative;
      flex: none;
      width: 38px;
      height: 22px;
      padding: 0;
      border: 0;
      border-radius: var(--radius-pill);
      background: var(--color-border-strong);
      cursor: pointer;
      transition: background var(--motion-base) ease;
    }

    /* amplía la zona pulsable sin cambiar el tamaño visible */
    .switch::after {
      content: '';
      position: absolute;
      inset: -11px;
    }

    .switch__thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--color-on-primary);
      box-shadow: var(--shadow-1);
      transition:
        transform var(--motion-base) var(--motion-ease),
        width var(--motion-fast) var(--motion-ease);
    }

    .switch[aria-checked='true'] {
      background: var(--color-primary);
    }

    .switch[aria-checked='true'] .switch__thumb {
      transform: translateX(16px);
    }

    .switch:active:not(:disabled, .is-locked) .switch__thumb {
      width: 21px;
    }

    .switch[aria-checked='true']:active:not(:disabled, .is-locked) .switch__thumb {
      transform: translateX(13px);
    }

    .switch:disabled,
    .switch.is-locked {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class ToggleComponent implements ControlValueAccessor {
  readonly checked = input(false);
  readonly disabled = input(false);
  /** Nombre accesible. Usa `labelledBy` si ya hay un texto visible que lo describe. */
  readonly label = input('');
  readonly labelledBy = input('');
  /** Id del texto que lo explica, por ejemplo por qué no se puede cambiar. */
  readonly describedBy = input<string | null>(null);
  /**
   * No se puede cambiar, pero sigue llegando el foco para leer su explicación
   * (`describedBy`). Un `disabled` nativo la dejaría fuera del teclado.
   */
  readonly locked = input(false);
  readonly checkedChange = output<boolean>();

  protected readonly value = linkedSignal(() => this.checked());
  private readonly disabledByForm = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByForm());

  private boundToForm = false;
  private onChange: (value: boolean) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected toggle(): void {
    if (this.locked()) return;
    const next = !this.value();
    // Solo un control de formulario se actualiza a sí mismo.
    if (this.boundToForm) this.value.set(next);
    this.onChange(next);
    this.checkedChange.emit(next);
  }

  writeValue(value: boolean | null): void {
    this.value.set(value ?? false);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.boundToForm = true;
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
  }
}
