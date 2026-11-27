import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

import { SceneKind, drawScene } from './landscape';

/**
 * Una foto que ocupa su caja (object-fit: cover) con su tamaño reservado: quien la usa le da la
 * proporción con `aspect-ratio`, así no hay saltos mientras carga.
 *
 * Debajo siempre está un paisaje de la marca (landscape.ts: montaña, costa, puertos, viñedos o uno
 * general, con la luz del día que toque), y la foto aparece encima cuando llega.
 * Así, sin url, si la foto falla o si el servidor de imágenes no contesta nunca (pasa con picsum),
 * se ve el paisaje y no un hueco ni un icono roto.
 *
 * Las fotos del seed son de 1200 × 800: es el tamaño intrínseco que se declara. La API no da
 * variantes de tamaño, así que no hay srcset.
 */
@Component({
  selector: 'ui-photo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo.component.html',
  styleUrl: './photo.component.css',
})
export class PhotoComponent {
  readonly src = input<string | null>(null);
  /** Texto alternativo. Vacío si la foto es decorativa (el texto de al lado ya la nombra). */
  readonly alt = input('');
  /** De qué se dibuja el paisaje de recurso: el slug de lo que enseña. */
  readonly seed = input('routly');
  /** Qué paisaje se dibuja: el del tipo de carretera (sceneFor). Sin él, uno según la semilla. */
  readonly scene = input<SceneKind | null>(null);
  /** La primera imagen de la página (la del Home): se pide enseguida, no al llegar a ella. */
  readonly priority = input(false);

  protected readonly failed = signal(false);
  protected readonly loaded = signal(false);
  protected readonly showsImage = computed(() => !!this.src() && !this.failed());
  protected readonly landscape = computed(() => drawScene(this.seed(), this.scene()));
  protected readonly gradientId = `sky-${nextId++}`;

  constructor() {
    // Otra url, otra oportunidad de cargar
    effect(() => {
      this.src();
      this.failed.set(false);
      this.loaded.set(false);
    });
  }
}

let nextId = 0;
