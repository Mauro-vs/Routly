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
  template: `
    <ng-content />
    @if (text(); as text) {
      <span
        class="tip"
        role="tooltip"
        [id]="id"
        [class.is-open]="open()"
        [class.is-below]="below()"
        [style.left.px]="x()"
        [style.top.px]="y()"
        >{{ text }}</span
      >
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .tip {
      position: fixed;
      z-index: var(--z-tooltip);
      width: max-content;
      /* el doble de TIP_HALF_WIDTH, menos un margen */
      max-width: 240px;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      background: var(--color-text);
      color: var(--color-surface);
      font-size: var(--text-xs);
      font-weight: 500;
      line-height: 1.4;
      text-align: left;
      white-space: normal;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transform: translate(-50%, calc(-100% - 4px));
      transition:
        opacity var(--motion-fast) var(--motion-ease),
        transform var(--motion-fast) var(--motion-ease),
        visibility 0s var(--motion-fast);
    }

    .tip.is-open {
      opacity: 1;
      visibility: visible;
      transform: translate(-50%, calc(-100% - 8px));
      transition-delay: 0s;
    }

    .tip.is-below {
      transform: translate(-50%, 4px);
    }

    .tip.is-below.is-open {
      transform: translate(-50%, 8px);
    }
  `,
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
