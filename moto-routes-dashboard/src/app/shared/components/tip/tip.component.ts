import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

let nextId = 0;

// Medidas del globo, para que no se salga de la ventana.
const TIP_HALF_WIDTH = 130;
const TIP_SPACE_ABOVE = 72;

/**
 * Explicación breve de un control, por ejemplo por qué un botón está desactivado.
 * Aparece al pasar el ratón o al llegar con el teclado, y se cierra con Escape.
 *
 * El control se proyecta dentro y enlaza el texto con `aria-describedby`, así el
 * lector de pantalla lo lee aunque no se vea:
 *
 *   <ui-tip #tip [text]="motivo">
 *     <button aria-disabled="true" [attr.aria-describedby]="tip.describedBy()">…</button>
 *   </ui-tip>
 *
 * El globo va en posición fija y no dentro del flujo: así no lo recorta una tabla
 * con desplazamiento horizontal.
 */
@Component({
  selector: 'ui-tip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tip.component.html',
  styleUrl: './tip.component.css',
  host: {
    '(mouseenter)': 'show()',
    '(focusin)': 'show()',
    '(mouseleave)': 'hide()',
    '(focusout)': 'hide()',
    '(keydown.escape)': 'hide()',
    '(window:scroll)': 'hide()',
  },
})
export class TipComponent {
  /** Sin texto no se muestra nada y el control queda como estaba. */
  readonly text = input<string | null>(null);

  readonly id = `tip-${nextId++}`;
  /** Para el `aria-describedby` del control: null si no hay texto. */
  readonly describedBy = computed(() => (this.text() ? this.id : null));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly open = signal(false);
  protected readonly below = signal(false);
  protected readonly x = signal(0);
  protected readonly y = signal(0);

  protected show(): void {
    if (!this.text()) return;

    const rect = this.host.nativeElement.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const maxX = window.innerWidth - TIP_HALF_WIDTH;
    // Arriba del control, salvo que no quepa: entonces debajo.
    const below = rect.top < TIP_SPACE_ABOVE;

    this.x.set(Math.min(Math.max(center, TIP_HALF_WIDTH), Math.max(maxX, TIP_HALF_WIDTH)));
    this.y.set(below ? rect.bottom : rect.top);
    this.below.set(below);
    this.open.set(true);
  }

  protected hide(): void {
    this.open.set(false);
  }
}
