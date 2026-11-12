import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { ActiveFiltersComponent } from '../../shared/ui/active-filters/active-filters.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PagerComponent } from '../../shared/ui/pager/pager.component';
import { SearchBoxComponent } from '../../shared/ui/search-box/search-box.component';
import { plural } from '../../shared/utils/shop-format';
import { ExperienceListComponent } from './components/experience-list/experience-list.component';
import { FilterSheetComponent } from './components/filter-sheet/filter-sheet.component';
import { GantryPlate, ShopGantryComponent } from './components/shop-gantry/shop-gantry.component';
import { DIFFICULTIES, SORTS, SortKey } from './shop-query';
import { ShopStore } from './shop.store';

/**
 * El Shop (modo Operate): encontrar y elegir rápido. Arriba, el pórtico con los filtros y la
 * búsqueda (en el móvil, la búsqueda y una hoja con los filtros); debajo, cuántas hay, los filtros
 * puestos, el orden, las tarjetas y la paginación. Todo sale de la URL a través de ShopStore.
 * Contrato de dirección: .impeccable/surfaces/moto-routes-web-src-app-features-shop.md
 */
@Component({
  selector: 'app-shop-page',
  imports: [
    ShopGantryComponent,
    FilterSheetComponent,
    ExperienceListComponent,
    ActiveFiltersComponent,
    PagerComponent,
    SearchBoxComponent,
    IconComponent,
  ],
  providers: [ShopStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="on-band head">
      <div class="wrap">
        <h1>Experiencias</h1>
        <app-shop-gantry
          class="desktop-only"
          [plates]="plates()"
          [search]="store.query().search"
          (filterChange)="store.setFilter($event.key, $event.value)"
          (searchChange)="store.setSearch($event)"
        />
        <div class="mobile-tools">
          <ui-search-box label="Buscar experiencias" placeholder="costa, pirineo, viñedos…" [value]="store.query().search" (search)="store.setSearch($event)" />
          <button type="button" class="btn-ghost filters-button" [attr.aria-label]="filtersLabel()" (click)="sheet.open()">
            <ui-icon name="sliders-horizontal" /> Filtros
            @if (filterCount() > 0) {
              <span class="badge num" aria-hidden="true">{{ filterCount() }}</span>
            }
          </button>
        </div>
      </div>
    </section>

    <div class="wrap body" [attr.aria-busy]="store.status() === 'loading'">
      <div class="bar">
        <p class="count num" role="status" aria-live="polite">{{ countLabel() }}</p>
        <div class="tools">
          <label class="desktop-only select">
            <span class="sr-only">Dificultad</span>
            <select [value]="store.query().difficulty ?? ''" (change)="store.setFilter('difficulty', $any($event.target).value || null)">
              <option value="">Cualquier dificultad</option>
              @for (level of difficulties; track level.value) {
                <option [value]="level.value">{{ level.label }}</option>
              }
            </select>
          </label>
          <label class="desktop-only check">
            <input type="checkbox" [checked]="store.query().withDates" (change)="store.setWithDates($any($event.target).checked)" />
            Solo con fechas
          </label>
          <label class="select">
            <span class="sr-only">Ordenar</span>
            <select [value]="store.query().sort ?? ''" (change)="store.setSort($any($event.target).value || null)">
              <option value="">{{ store.query().search ? 'Las que mejor encajan' : 'Novedades' }}</option>
              @for (sort of sorts; track sort.value) {
                <option [value]="sort.value">{{ sort.label }}</option>
              }
            </select>
          </label>
        </div>
        <ui-active-filters class="chips" [filters]="store.activeFilters()" (remove)="store.removeFilter($event)" (clear)="store.clearFilters()" />
      </div>

      @if (store.status() === 'error') {
        <div class="state" role="alert">
          <h2>No se han podido cargar las experiencias</h2>
          <p>{{ store.error() }}</p>
          <button type="button" class="btn-ghost" (click)="store.retry()"><ui-icon name="arrows-clockwise" /> Reintentar</button>
        </div>
      } @else if (store.loadedOnce() && store.total() === 0 && store.status() === 'ready') {
        <div class="state">
          <h2>No hay experiencias con estos filtros</h2>
          @if (store.query().search) {
            <p>La búsqueda va por palabras enteras: prueba con «costa», «pirineo» o «viñedos».</p>
          } @else {
            <p>Prueba a quitar algún filtro para ver más salidas.</p>
          }
          @if (store.activeFilters().length > 0) {
            <button type="button" class="btn-primary" (click)="store.clearFilters()">Quitar los filtros</button>
          }
        </div>
      } @else {
        <app-experience-list
          [experiences]="store.experiences()"
          [skeleton]="!store.loadedOnce()"
          [stale]="store.loadedOnce() && store.status() === 'loading'"
        />
      }

      <ui-pager class="pager" [page]="store.query().page" [totalPages]="store.totalPages()" />
    </div>

    <app-filter-sheet
      #sheet
      [plates]="sheetPlates()"
      [withDates]="store.query().withDates"
      [resultsLabel]="sheetLabel()"
      (filterChange)="store.setFilter($event.key, $event.value)"
      (withDatesChange)="store.setWithDates($event)"
    />
  `,
  styles: `
    :host {
      display: block;
    }

    .head .wrap {
      display: grid;
      gap: var(--space-4);
      padding-block: var(--space-6);
    }

    h1 {
      font-size: clamp(34px, 4.6vw, 56px);
      font-weight: 850;
      letter-spacing: -0.04em;
      line-height: 1;
    }

    .mobile-tools {
      display: none;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-2);
      align-items: start;
    }

    .mobile-tools ui-search-box {
      --color-surface: #ffffff;
      --color-text: #0f1a15;
      --color-text-muted: #4c5d53;
      --color-border-strong: #ffffff;
    }

    .filters-button {
      min-height: 48px;
      border-color: rgb(255 255 255 / 0.5);
      color: var(--color-on-band);
    }

    .badge {
      display: grid;
      place-items: center;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      border-radius: 11px;
      background: var(--color-accent);
      color: var(--color-on-accent);
      font-size: 12px;
      font-weight: 800;
    }

    .body {
      padding-block: var(--space-5) var(--space-7);
    }

    .bar {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: var(--space-3) var(--space-4);
      margin-bottom: var(--space-6);
    }

    .count {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    .tools {
      display: flex;
      flex-wrap: wrap;
      justify-content: end;
      align-items: center;
      gap: var(--space-3);
    }

    .chips {
      grid-column: 1 / -1;
    }

    .chips:empty {
      display: none;
    }

    select {
      min-height: 44px;
      padding: 0 var(--space-3);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 15px;
    }

    .check {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 44px;
      font-weight: 650;
      cursor: pointer;
    }

    .check input {
      width: 18px;
      height: 18px;
      accent-color: var(--color-primary);
    }

    .state {
      display: grid;
      justify-items: start;
      gap: var(--space-3);
      max-width: 56ch;
      padding: var(--space-7) 0;
    }

    .state h2 {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .state p {
      color: var(--color-text-muted);
    }

    .pager {
      display: block;
      margin-top: var(--space-7);
    }

    @media (max-width: 860px) {
      .desktop-only {
        display: none;
      }

      .mobile-tools {
        display: grid;
      }

      .head .wrap {
        padding-block: var(--space-5);
      }

      .bar {
        grid-template-columns: 1fr auto;
      }
    }
  `,
})
export class ShopPageComponent {
  protected readonly store = inject(ShopStore);

  protected readonly difficulties = Object.entries(DIFFICULTIES).map(([value, { label }]) => ({ value, label }));
  protected readonly sorts = (Object.keys(SORTS) as SortKey[]).map((value) => ({ value, label: SORTS[value].label }));

  /** Las tres placas del pórtico: tipo de carretera, destino y guía */
  protected readonly plates = computed<GantryPlate[]>(() => {
    const query = this.store.query();
    return [
      {
        key: 'category',
        label: 'Carretera',
        allLabel: 'Cualquiera',
        value: query.category,
        options: this.store.categories().map((c) => ({ value: c.slug, label: c.name, count: c.experienceCount })),
      },
      {
        key: 'location',
        label: 'Destino',
        allLabel: 'Cualquiera',
        value: query.location,
        options: this.store.locations().map((l) => ({ value: l.slug, label: l.city, count: l.experienceCount })),
      },
      {
        key: 'host',
        label: 'Guía',
        allLabel: 'Cualquiera',
        value: query.host,
        options: this.store.hosts().map((h) => ({ value: h.slug, label: h.name, count: h.experienceCount })),
      },
    ];
  });

  /** En la hoja del móvil, además, la dificultad */
  protected readonly sheetPlates = computed<GantryPlate[]>(() => [
    ...this.plates(),
    {
      key: 'difficulty',
      label: 'Dificultad',
      allLabel: 'Cualquiera',
      value: this.store.query().difficulty,
      options: this.difficulties,
    },
  ]);

  /** Filtros puestos sin contar la búsqueda (que se ve en su campo) */
  protected readonly filterCount = computed(() => this.store.activeFilters().filter((filter) => filter.key !== 'buscar').length);

  protected readonly filtersLabel = computed(() =>
    this.filterCount() > 0 ? `Filtros, ${plural(this.filterCount(), 'puesto', 'puestos')}` : 'Filtros',
  );

  protected readonly countLabel = computed(() =>
    this.store.loadedOnce() ? plural(this.store.total(), 'experiencia', 'experiencias') : 'Buscando experiencias…',
  );

  protected readonly sheetLabel = computed(() =>
    this.store.status() === 'loading' ? 'Buscando…' : `Ver ${plural(this.store.total(), 'experiencia', 'experiencias')}`,
  );

  constructor() {
    this.store.loadFacets();
    // La URL manda: cada cambio (un filtro, atrás, un enlace del Home) vuelve a pedir
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => this.store.sync(params));
  }
}
