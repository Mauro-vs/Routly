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
  template: `
    <div class="inner">
      <h1>¿Hacia dónde rodamos?</h1>
      <p class="lead">Salidas guiadas en moto por carreteras elegidas una a una, con anfitrión, fecha y plazas.</p>

      @if (error()) {
        <div class="error" role="alert">
          <p>{{ error() }}</p>
          <button type="button" class="retry" (click)="retry.emit()">
            <ui-icon name="arrows-clockwise" /> Reintentar
          </button>
        </div>
      } @else if (loading()) {
        <div class="rows" aria-hidden="true">
          @for (row of [1, 2, 3, 4]; track row) {
            <div class="row row--skeleton"><ui-skeleton width="45%" height="20px" /></div>
          }
        </div>
      } @else {
        <nav aria-label="Tipos de carretera" class="rows">
          @for (category of categories(); track category._id) {
            <a class="row" [routerLink]="['/experiencias']" [queryParams]="{ categoria: category.slug }">
              <span class="name">{{ category.name }}</span>
              <span class="count num">{{ category.experienceCount }} {{ category.experienceCount === 1 ? 'experiencia' : 'experiencias' }}</span>
              <span class="arrow"><ui-icon name="arrow-up-right" /></span>
            </a>
          }
        </nav>
      }

      <form class="search" role="search" (submit)="submit($event, query.value)">
        <label for="home-search" class="sr-only">Buscar experiencias</label>
        <input id="home-search" #query type="search" enterkeyhint="search" autocomplete="off"
          placeholder="costa, pirineo, viñedos…" />
        <button type="submit" class="btn-primary">Buscar</button>
      </form>
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding: 6px;
      border-radius: var(--radius-lg);
      background: var(--sign);
      color: var(--on-sign);
      box-shadow: 0 30px 60px -30px rgb(0 0 0 / 0.75);
    }

    .inner {
      padding: 20px 22px 18px;
      border: 3px solid var(--on-sign);
      border-radius: var(--radius-md);
    }

    h1 {
      font-size: clamp(30px, 3.8vw, 46px);
      font-weight: 850;
      letter-spacing: -0.035em;
      line-height: 1;
    }

    .lead {
      margin: var(--space-2) 0 var(--space-4);
      max-width: 40ch;
      color: rgb(255 255 255 / 0.86);
    }

    .rows {
      display: grid;
    }

    .row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto 44px;
      align-items: center;
      gap: var(--space-3);
      min-height: 54px;
      border-top: 2px solid var(--sign-rule);
      color: inherit;
      text-decoration: none;
    }

    .row:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    .name {
      font-size: 22px;
      font-weight: 750;
      letter-spacing: -0.01em;
      overflow-wrap: anywhere;
    }

    .count {
      font-size: var(--text-sm);
      font-weight: 650;
      color: rgb(255 255 255 / 0.86);
    }

    .arrow {
      display: grid;
      place-items: center;
      width: 44px;
      height: 36px;
      border-radius: var(--radius-sm);
      font-size: 20px;
      transition:
        background var(--motion-fast) var(--motion-ease),
        color var(--motion-fast) var(--motion-ease);
    }

    /* La flecha se rellena de lima, como la salida que vas a tomar */
    .row:hover .arrow,
    .row:focus-visible .arrow {
      background: var(--color-accent);
      color: var(--color-on-accent);
    }

    .row--skeleton {
      grid-template-columns: 1fr;
    }

    .row--skeleton ui-skeleton {
      background: rgb(255 255 255 / 0.16);
    }

    .search {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 2px solid var(--sign-rule);
    }

    input {
      min-width: 0;
      height: 48px;
      padding: 0 var(--space-4);
      border: 0;
      border-radius: var(--radius-md);
      background: var(--plate-paper);
      color: var(--plate-ink);
      /* 16 px: en el móvil, un campo más pequeño hace zoom al enfocarlo */
      font-size: 16px;
    }

    input::placeholder {
      color: #4c5d53;
    }

    input:focus-visible,
    .search .btn-primary:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    .error {
      display: grid;
      justify-items: start;
      gap: var(--space-3);
      padding: var(--space-4) 0;
      border-top: 2px solid var(--sign-rule);
    }

    .retry {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 44px;
      padding: 0 var(--space-4);
      border: 2px solid var(--on-sign);
      border-radius: var(--radius-md);
      background: none;
      color: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    @media (max-width: 560px) {
      .inner {
        padding: 16px 16px 14px;
      }

      .name {
        font-size: 19px;
      }

      .search {
        grid-template-columns: 1fr;
      }
    }
  `,
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
