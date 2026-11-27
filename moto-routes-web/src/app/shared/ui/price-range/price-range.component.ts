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
  templateUrl: './price-range.component.html',
  styleUrl: './price-range.component.css',
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
