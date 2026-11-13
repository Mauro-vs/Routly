import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { PhotoComponent } from '../../shared/ui/photo/photo.component';
import { sceneFor } from '../../shared/ui/photo/landscape';
import { formatNumber } from '../../shared/utils/shop-format';
import { PlaceItem, PlaceRailComponent } from './components/place-rail/place-rail.component';
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
  imports: [PhotoComponent, SignPanelComponent, PlaceRailComponent],
  providers: [HomeStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero" [attr.aria-busy]="store.status() === 'loading'">
      <ui-photo class="backdrop" [src]="store.cover()?.url ?? null" [seed]="store.cover()?.seed ?? 'routly'" scene="pass" alt="" [priority]="true" />
      <div class="wrap hero-body">
        <app-sign-panel
          [categories]="store.categories()"
          [loading]="store.status() === 'loading'"
          [error]="store.error()"
          (search)="search($event)"
          (retry)="store.load()"
        />
        @if (store.total(); as total) {
          <p class="milestone num" [class.is-wide]="totalLabel().length > 4">
            <span class="cap" aria-hidden="true">Routly</span>
            <span class="body"><strong>{{ totalLabel() }}</strong> {{ total === 1 ? 'experiencia' : 'experiencias' }}</span>
            <span class="post" aria-hidden="true"></span>
          </p>
        }
      </div>
    </section>

    @if (store.status() === 'ready') {
      <div class="wrap rails">
        @if (locations().length > 0) {
          <app-place-rail id="destinos" headingId="destinos-titulo" title="Destinos" allLabel="Todos los destinos" kind="town" [items]="locations()" />
        }
        @if (categories().length > 0) {
          <app-place-rail id="carreteras" headingId="carreteras-titulo" title="Tipos de carretera" kind="route" [items]="categories()" />
        }
        @if (hosts().length > 0) {
          <app-place-rail id="guias" headingId="guias-titulo" title="Con quién rodar" allLabel="Todos los guías" kind="guide" [items]="hosts()" />
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    /* La carretera a sangre, con el panel abajo a la izquierda y el hito abajo a la derecha */
    .hero {
      position: relative;
      display: grid;
      align-items: end;
      min-height: min(88vh, 800px);
      padding-top: calc(var(--layout-header) + var(--space-6));
      overflow: hidden;
      background: var(--color-band);
    }

    .backdrop {
      position: absolute;
      inset: 0;
    }

    /* Para leer la cabecera y que el panel no flote sobre un cielo claro: oscurece arriba y abajo */
    .hero::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 1;
      background:
        linear-gradient(rgb(7 18 12 / 0.7), transparent 22%),
        linear-gradient(transparent 50%, rgb(7 18 12 / 0.55));
      pointer-events: none;
    }

    .hero-body {
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: minmax(0, 580px) 1fr;
      align-items: end;
      gap: var(--space-6);
      padding-bottom: var(--space-7);
    }

    /* El hito kilométrico: capuchón lima, cuerpo blanco y el poste */
    .milestone {
      justify-self: end;
      display: grid;
      width: 136px;
      color: var(--plate-ink);
      text-align: center;
      filter: drop-shadow(0 18px 28px rgb(0 0 0 / 0.5));
    }

    .cap {
      display: grid;
      place-items: center;
      height: 38px;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      background: var(--color-accent);
      color: var(--color-on-accent);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .body {
      display: grid;
      padding: var(--space-3) var(--space-2) var(--space-4);
      background: var(--plate-paper);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .body strong {
      font-size: 48px;
      font-weight: 850;
      letter-spacing: -0.04em;
      line-height: 1;
      text-transform: none;
    }

    /* Con cinco cifras o más ("12.840") la cifra encoge para caber en el poste */
    .milestone.is-wide .body strong {
      font-size: 34px;
    }

    .post {
      width: 22px;
      height: 64px;
      margin: 0 auto;
      background: var(--plate-paper);
      opacity: 0.92;
    }

    .rails {
      display: grid;
      gap: var(--space-7);
      padding-block: var(--space-7) calc(var(--space-7) * 1.5);
    }

    @media (max-width: 860px) {
      .hero {
        min-height: 0;
        padding-top: calc(var(--layout-header) + 34vw);
      }

      .hero-body {
        grid-template-columns: 1fr;
        padding-bottom: var(--space-5);
      }

      .milestone {
        display: none;
      }
    }
  `,
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
    })),
  );

  constructor() {
    void this.store.load();
  }

  protected search(text: string): void {
    void this.router.navigate(['/experiencias'], { queryParams: text ? { buscar: text } : {} });
  }
}
