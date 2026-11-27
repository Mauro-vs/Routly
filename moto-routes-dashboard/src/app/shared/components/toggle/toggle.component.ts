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
  templateUrl: './toggle.component.html',
  styleUrl: './toggle.component.css',
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
