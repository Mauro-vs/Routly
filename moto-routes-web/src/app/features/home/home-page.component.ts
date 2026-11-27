import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { PhotoComponent } from '../../shared/ui/photo/photo.component';
import { sceneFor } from '../../shared/ui/photo/landscape';
import { formatNumber } from '../../shared/utils/shop-format';
import { PlaceItem, PlaceRailComponent } from './components/place-rail/place-rail.component';
import { DeparturesBoardComponent } from './components/departures-board/departures-board.component';
import { SignPanelComponent } from './components/sign-panel/sign-panel.component';
import { HomeStore } from './home.store';

/**
 * El Home (modo Persuade): una carretera a sangre y, encima, el panel de orientación con los tipos
 * de carretera y la búsqueda. Debajo, los destinos, los tipos de carretera y los guías, cada uno
 * en su carrusel. Todo lleva al Shop con el filtro puesto en la URL.
 * Contrato de dirección: .impeccable/surfaces/moto-routes-web-src-app-features-home.md
 */
@Component({
  selector: 'app-home-page',
  imports: [DeparturesBoardComponent, PhotoComponent, SignPanelComponent, PlaceRailComponent],
  providers: [HomeStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent {
  protected readonly store = inject(HomeStore);
  private readonly router = inject(Router);

  /** El total del hito, con su separador de miles en español */
  protected readonly totalLabel = computed(() => formatNumber(this.store.total() ?? 0));

  protected readonly categories = computed<PlaceItem[]>(() =>
    this.store.categories().map((category) => ({
      id: category._id,
      name: category.name,
      count: category.experienceCount,
      photo: category.coverImage?.url ?? null,
      seed: category.slug,
      scene: sceneFor(category.name),
      queryParams: { categoria: category.slug },
    })),
  );

  protected readonly locations = computed<PlaceItem[]>(() =>
    this.store.locations().map((location) => ({
      id: location._id,
      name: location.city,
      count: location.experienceCount,
      photo: location.coverImage?.url ?? null,
      seed: location.slug,
      queryParams: { ubicacion: location.slug },
    })),
  );

  protected readonly hosts = computed<PlaceItem[]>(() =>
    this.store.hosts().map((host) => ({
      id: host._id,
      name: host.name,
      count: host.experienceCount,
      photo: host.coverImage?.url ?? null,
      seed: host.slug,
      queryParams: { anfitrion: host.slug },
      link: ['/guias', host.slug],
    })),
  );

  constructor() {
    void this.store.load();
  }

  protected search(text: string): void {
    void this.router.navigate(['/experiencias'], { queryParams: text ? { buscar: text } : {} });
  }
}
