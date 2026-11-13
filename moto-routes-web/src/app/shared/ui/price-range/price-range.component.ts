import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';

/** Un rango elegido: null en un extremo es "sin límite" por ese lado. */
export interface PriceRange {
  min: number | null;
  max: number | null;
}

/**
 * Un slider de precio con dos tiradores, el mínimo y el máximo. Son dos `input type="range"`
 * nativos superpuestos: funcionan con el teclado (flechas, Inicio, Fin) y con los lectores de
 * pantalla sin hacer nada más. El texto de encima cambia mientras se arrastra, pero el rango solo
 * se avisa al soltar (`change`): así no se pide una página por cada paso.
 *
 *   <ui-price-range [floor]="0" [ceiling]="400" [step]="10" [value]="{ min: 40, max: null }"
 *                   (valueChange)="setPrice($event)" />
 */
@Component({
  selector: 'ui-price-range',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="price">
      <legend class="label"><span class="name">{{ legend() }}</span> <span class="num value">{{ text() }}</span></legend>
      <div class="track" [style.--from.%]="percent(low())" [style.--to.%]="percent(high())">
        <input
          #lowInput
          type="range"
          name="precio-min"
          aria-label="Precio mínimo"
          [attr.aria-valuetext]="low() + ' €'"
          [min]="floor()"
          [max]="ceiling()"
          [step]="step()"
          [value]="low()"
          (input)="moveLow(lowInput)"
          (change)="commit()"
        />
        <input
          #highInput
          type="range"
          name="precio-max"
          aria-label="Precio máximo"
          [attr.aria-valuetext]="high() >= ceiling() ? 'sin límite' : high() + ' €'"
          [min]="floor()"
          [max]="ceiling()"
          [step]="step()"
          [value]="high()"
          (input)="moveHigh(highInput)"
          (change)="commit()"
        />
      </div>
    </fieldset>
  `,
  styles: `
    :host {
      display: block;
      min-width: 220px;
    }

    .price {
      margin: 0;
      padding: 0;
      border: 0;
    }

    .label {
      display: flex;
      justify-content: space-between;
      gap: var(--space-2, 8px);
      width: 100%;
      padding: 0;
      font-size: var(--text-sm, 0.875rem);
      color: var(--color-text-muted);
    }

    /* Como el título de los demás grupos de filtros (ui-filter-group) */
    .name {
      font-size: var(--text-xs);
      font-weight: 750;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .value {
      color: var(--color-text);
      font-weight: 600;
    }

    /* La barra: gris, y del color de la marca entre los dos tiradores */
    .track {
      position: relative;
      height: 28px;
    }

    .track::before {
      content: '';
      position: absolute;
      inset: 50% 0 auto;
      height: 4px;
      border-radius: 999px;
      transform: translateY(-50%);
      background: linear-gradient(
        to right,
        var(--color-border-strong) var(--from),
        var(--color-primary) var(--from),
        var(--color-primary) var(--to),
        var(--color-border-strong) var(--to)
      );
    }

    /* Las dos barras nativas, una encima de otra; solo los tiradores reciben el ratón */
    input {
      position: absolute;
      inset: 0;
      width: 100%;
      margin: 0;
      background: none;
      pointer-events: none;
      appearance: none;
    }

    input::-webkit-slider-runnable-track {
      background: none;
    }

    input::-moz-range-track {
      background: none;
    }

    input::-webkit-slider-thumb {
      width: 20px;
      height: 20px;
      border: 2px solid var(--color-primary);
      border-radius: 50%;
      background: var(--color-surface, #fff);
      pointer-events: auto;
      cursor: grab;
      appearance: none;
    }

    input::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border: 2px solid var(--color-primary);
      border-radius: 50%;
      background: var(--color-surface, #fff);
      pointer-events: auto;
      cursor: grab;
    }

    input:focus-visible::-webkit-slider-thumb {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    input:focus-visible::-moz-range-thumb {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  `,
})
export class PriceRangeComponent {
  readonly legend = input('Precio');
  readonly floor = input(0);
  readonly ceiling = input(400);
  readonly step = input(10);
  readonly value = input<PriceRange>({ min: null, max: null });
  readonly valueChange = output<PriceRange>();

  // Mientras se arrastra: siguen a value cuando cambia desde fuera (la URL)
  protected readonly low = linkedSignal(() => this.value().min ?? this.floor());
  protected readonly high = linkedSignal(() => this.value().max ?? this.ceiling());

  protected readonly text = computed(() => {
    const [low, high, floor, ceiling] = [this.low(), this.high(), this.floor(), this.ceiling()];
    if (low <= floor && high >= ceiling) return 'Cualquiera';
    if (low <= floor) return `Hasta ${high} €`;
    if (high >= ceiling) return `Desde ${low} €`;
    return `${low} € – ${high} €`;
  });

  protected percent(price: number): number {
    const span = this.ceiling() - this.floor();
    return span > 0 ? ((price - this.floor()) / span) * 100 : 0;
  }

  // Los tiradores no se cruzan: siempre queda un paso entre ellos. Si se intenta, el tirador
  // vuelve a su tope (el valor del signal no cambia, así que hay que ponérselo a mano)
  protected moveLow(input: HTMLInputElement): void {
    this.low.set(Math.min(input.valueAsNumber, this.high() - this.step()));
    input.value = String(this.low());
  }

  protected moveHigh(input: HTMLInputElement): void {
    this.high.set(Math.max(input.valueAsNumber, this.low() + this.step()));
    input.value = String(this.high());
  }

  /** Al soltar: los extremos son "sin límite". */
  protected commit(): void {
    this.valueChange.emit({
      min: this.low() > this.floor() ? this.low() : null,
      max: this.high() < this.ceiling() ? this.high() : null,
    });
  }
}
