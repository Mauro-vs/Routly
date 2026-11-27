import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { ActiveFiltersComponent } from '../../shared/ui/active-filters/active-filters.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PagerComponent } from '../../shared/ui/pager/pager.component';
import { PriceRange, PriceRangeComponent } from '../../shared/ui/price-range/price-range.component';
import { SearchBoxComponent } from '../../shared/ui/search-box/search-box.component';
import { plural } from '../../shared/utils/shop-format';
import { ExperienceListComponent } from './components/experience-list/experience-list.component';
import { FilterSheetComponent } from './components/filter-sheet/filter-sheet.component';
import { GantryPlate, ShopGantryComponent } from './components/shop-gantry/shop-gantry.component';
import { DIFFICULTIES, PRICE_RANGE, SORTS, SortKey } from './shop-query';
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
    PriceRangeComponent,
    IconComponent,
  ],
  providers: [ShopStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shop-page.component.html',
  styleUrl: './shop-page.component.css',
})
export class ShopPageComponent {
  protected readonly store = inject(ShopStore);

  protected readonly difficulties = Object.entries(DIFFICULTIES).map(([value, { label }]) => ({ value, label }));
  protected readonly priceRange = PRICE_RANGE;
  /** El rango del slider, desde la URL. Un computed: el mismo objeto mientras no cambie */
  protected readonly price = computed<PriceRange>(() => ({ min: this.store.query().priceMin, max: this.store.query().priceMax }));
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

  // Solo los órdenes que existen: el valor vacío es el de por defecto
  protected setSort(value: string): void {
    this.store.setSort(value in SORTS ? (value as SortKey) : null);
  }

  constructor() {
    this.store.loadFacets();
    // La URL manda: cada cambio (un filtro, atrás, un enlace del Home) vuelve a pedir
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => this.store.sync(params));
  }
}
