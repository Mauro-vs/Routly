import { ChangeDetectionStrategy, Component } from '@angular/core';

let nextId = 0;

/**
 * Logo de Routly: la R (con su cuchilla) arranca una carretera que corre bajo el nombre y acaba en
 * la cola de la y. Es el mismo dibujo que docs/assets/logo.svg, pero toma el color del texto.
 * Es decorativo: el enlace que lo contiene lleva el nombre accesible.
 */
@Component({
  selector: 'ui-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brand-mark.component.html',
  styleUrl: './brand-mark.component.css',
  host: { 'aria-hidden': 'true' },
})
export class BrandMarkComponent {
  // Un id por instancia: el sidebar puede estar dos veces en la página (escritorio y cajón)
  protected readonly maskId = `routly-road-${nextId++}`;
}
