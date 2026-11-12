import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { IconComponent } from '../icon/icon.component';

let nextId = 0;

// Lo que hay que mover el ratón antes de que cuente como arrastre y no como clic
const DRAG_THRESHOLD = 8;
// Deceleración de la inercia al soltar (la del scroll de iOS)
const DECELERATION = 0.998;

/**
 * Carrusel horizontal. No sabe qué enseña: cada hijo proyectado es un elemento (una tarjeta).
 *
 * - Con el dedo, el scroll nativo con `scroll-snap`: tiene inercia y se puede parar a mitad.
 * - Con el ratón, se arrastra 1:1 y, al soltar, sigue con la inercia hasta el elemento más cercano.
 *   Un arrastre no cuenta como clic en la tarjeta.
 * - Las flechas de los botones avanzan casi una pantalla; con el teclado, ← y → pasan el foco a la
 *   tarjeta de al lado.
 * - Con movimiento reducido, los saltos son instantáneos. Sin nada que desplazar, no hay botones.
 *
 * El ancho de cada tarjeta lo pone quien lo usa: el carrusel solo las coloca en fila.
 */
@Component({
  selector: 'ui-carousel',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="region" aria-roledescription="carrusel" [attr.aria-label]="label()">
      @if (scrollable()) {
        <div class="controls">
          <button type="button" aria-label="Anteriores" [attr.aria-controls]="trackId" [disabled]="atStart()" (click)="page(-1)">
            <ui-icon name="arrow-left" />
          </button>
          <button type="button" aria-label="Siguientes" [attr.aria-controls]="trackId" [disabled]="atEnd()" (click)="page(1)">
            <ui-icon name="arrow-right" />
          </button>
        </div>
      }
      <div
        #track
        class="track"
        role="list"
        [id]="trackId"
        [class.is-dragging]="dragging()"
        (scroll)="update()"
        (keydown)="onKeydown($event)"
        (pointerdown)="onPointerDown($event)"
        (click)="onClick($event)"
      >
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    [role='region'] {
      display: grid;
      gap: var(--space-3);
    }

    .controls {
      display: flex;
      justify-content: end;
      gap: var(--space-2);
      order: -1;
    }

    button {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 18px;
      cursor: pointer;
      transition: background var(--motion-fast), opacity var(--motion-fast);
    }

    button:hover:not(:disabled) {
      background: var(--color-surface-2);
    }

    button:active:not(:disabled) {
      transform: scale(0.97);
    }

    button:disabled {
      opacity: 0.4;
      cursor: default;
    }

    .track {
      display: flex;
      gap: var(--carousel-gap, var(--space-4));
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x mandatory;
      scroll-padding-inline: var(--carousel-inset, 0px);
      padding-inline: var(--carousel-inset, 0px);
      padding-block: 4px;
      scrollbar-width: none;
      cursor: grab;
    }

    .track::-webkit-scrollbar {
      display: none;
    }

    /* Mientras se arrastra con el ratón, sin imán: el contenido sigue al puntero */
    .track.is-dragging {
      scroll-snap-type: none;
      cursor: grabbing;
      user-select: none;
    }

    .track > ::ng-deep * {
      flex: none;
      scroll-snap-align: start;
    }

    .track.is-dragging > ::ng-deep * {
      pointer-events: none;
    }
  `,
})
export class CarouselComponent {
  /** El nombre del carrusel para el lector de pantalla: "Tipos de carretera" */
  readonly label = input.required<string>();

  protected readonly trackId = `carousel-${nextId++}`;
  protected readonly scrollable = signal(false);
  protected readonly atStart = signal(true);
  protected readonly atEnd = signal(false);
  protected readonly dragging = signal(false);

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  private suppressClick = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const track = this.track().nativeElement;
      // Los elementos pueden cambiar (llegan de la API) y el ancho también (girar el móvil)
      const mutations = new MutationObserver(() => this.update());
      mutations.observe(track, { childList: true });
      const resize = new ResizeObserver(() => this.update());
      resize.observe(track);
      destroyRef.onDestroy(() => {
        mutations.disconnect();
        resize.disconnect();
      });
      this.update();
    });
  }

  /** Recalcula si se puede desplazar y hacia dónde, y marca cada hijo como elemento de la lista. */
  protected update(): void {
    const track = this.track().nativeElement;
    for (const child of Array.from(track.children)) {
      if (child.getAttribute('role') !== 'listitem') child.setAttribute('role', 'listitem');
    }
    const max = track.scrollWidth - track.clientWidth;
    this.scrollable.set(max > 1);
    this.atStart.set(track.scrollLeft <= 1);
    this.atEnd.set(track.scrollLeft >= max - 1);
  }

  /** Avanza o retrocede casi una pantalla (deja asomar la última tarjeta vista). */
  protected page(direction: 1 | -1): void {
    const track = this.track().nativeElement;
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: this.behavior() });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const items = Array.from(this.track().nativeElement.children) as HTMLElement[];
    const current = items.findIndex((item) => item.contains(document.activeElement));
    if (current === -1) return;

    const next = items[current + (event.key === 'ArrowRight' ? 1 : -1)];
    const focusable = next && (next.matches(FOCUSABLE) ? next : next.querySelector<HTMLElement>(FOCUSABLE));
    if (!focusable) return;
    event.preventDefault();
    focusable.focus({ preventScroll: true });
    next.scrollIntoView({ behavior: this.behavior(), block: 'nearest', inline: 'nearest' });
  }

  /** Arrastre con el ratón (con el dedo ya lo hace el scroll nativo). */
  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !this.scrollable()) return;
    const track = this.track().nativeElement;
    const startX = event.clientX;
    const startScroll = track.scrollLeft;
    let history: Array<{ x: number; t: number }> = [{ x: startX, t: event.timeStamp }];
    let started = false;

    const move = (moveEvent: PointerEvent): void => {
      const dx = moveEvent.clientX - startX;
      if (!started) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        started = true;
        track.setPointerCapture(moveEvent.pointerId);
        this.dragging.set(true);
      }
      track.scrollLeft = startScroll - dx;
      history = [...history.slice(-4), { x: moveEvent.clientX, t: moveEvent.timeStamp }];
    };

    const end = (): void => {
      track.removeEventListener('pointermove', move);
      track.removeEventListener('pointerup', end);
      track.removeEventListener('pointercancel', end);
      if (!started) return;
      // El arrastre acaba con un "click" en la tarjeta de debajo: ese no cuenta
      this.suppressClick = true;
      this.dragging.set(false);
      this.settle(velocity(history));
    };

    track.addEventListener('pointermove', move);
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
  }

  protected onClick(event: MouseEvent): void {
    if (!this.suppressClick) return;
    this.suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }

  // Al soltar: proyecta adónde llevaría la inercia y va al elemento más cercano a ese punto
  private settle(pixelsPerSecond: number): void {
    const track = this.track().nativeElement;
    const projected = track.scrollLeft - ((pixelsPerSecond / 1000) * DECELERATION) / (1 - DECELERATION);
    // Dónde queda el inicio de cada tarjeta, en el scroll del carril (menos el margen interior)
    const inset = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const origin = track.getBoundingClientRect().left;
    const stops = (Array.from(track.children) as HTMLElement[]).map(
      (item) => item.getBoundingClientRect().left - origin + track.scrollLeft - inset,
    );
    const target = stops.reduce((best, stop) => (Math.abs(stop - projected) < Math.abs(best - projected) ? stop : best), 0);
    track.scrollTo({ left: target, behavior: this.behavior() });
  }

  private behavior(): ScrollBehavior {
    return this.reducedMotion.matches ? 'auto' : 'smooth';
  }
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Velocidad del puntero en px/s, de los últimos movimientos (no solo del último)
function velocity(history: Array<{ x: number; t: number }>): number {
  if (history.length < 2) return 0;
  const first = history[0];
  const last = history[history.length - 1];
  const elapsed = last.t - first.t;
  return elapsed > 0 ? ((last.x - first.x) / elapsed) * 1000 : 0;
}
