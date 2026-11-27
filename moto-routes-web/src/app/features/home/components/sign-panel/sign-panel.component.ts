import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ShopCategory } from '../../../../core/api/shop.models';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';

/**
 * El panel de orientación del Home: el titular, una fila por tipo de carretera (nombre, cuántas
 * experiencias y la flecha) que lleva al Shop filtrado, y la búsqueda como última fila. Es la
 * navegación de la portada: la señal es la interfaz, no un adorno.
 */
@Component({
  selector: 'app-sign-panel',
  imports: [RouterLink, IconComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-panel.component.html',
  styleUrl: './sign-panel.component.css',
})
export class SignPanelComponent {
  readonly categories = input.required<ShopCategory[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly search = output<string>();
  readonly retry = output<void>();

  protected submit(event: Event, value: string): void {
    event.preventDefault();
    this.search.emit(value.trim());
  }
}
