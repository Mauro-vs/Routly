import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Departure, DepartureState } from '../../../core/models/departure.model';
import { Route, RouteDifficulty } from '../../../core/models/route.model';
import { ApiService } from '../../../core/services/api.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { DashboardStore } from './dashboard.store';

const DAY = 24 * 60 * 60 * 1000;

function route(id: string, category: string, difficulty: RouteDifficulty, distance: number, isActive = true): Route {
  return {
    _id: id,
    slug: `ruta-${id}`,
    title: `Ruta ${id}`,
    difficulty,
    distance,
    duration: 2,
    categoryId: category,
    category: { _id: category, name: category, slug: category },
    startLocationId: 'l1',
    startLocation: null,
    endLocationId: 'l1',
    endLocation: null,
    status: isActive ? 'active' : 'inactive',
    isActive,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: `2026-01-0${id}T00:00:00.000Z`,
  } as Route;
}

function departure(id: string, inDays: number, state: DepartureState, capacity: number, price: number): Departure {
  const start = new Date(Date.now() + inDays * DAY).toISOString();
  return {
    _id: id,
    slug: `salida-${id}`,
    experienceId: 'e1',
    experience: { _id: 'e1', title: 'Pirineo', slug: 'pirineo' },
    startAt: start,
    endAt: start,
    capacity,
    price,
    state,
    sku: 'RTL-DEP-261108-7QX2M',
    status: 'active',
    isActive: true,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('DashboardStore', () => {
  let api: jasmine.SpyObj<ApiService>;
  let store: DashboardStore;

  async function loadWith(routes: Route[], departures: Departure[]): Promise<void> {
    api.get.and.callFake(((path: string) =>
      Promise.resolve(path === '/routes' ? routes : departures)) as never);
    await store.load();
  }

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('api', ['get']);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: api },
        { provide: ErrorHandlerService, useValue: jasmine.createSpyObj('errors', ['handle']) },
      ],
    });
    store = TestBed.inject(DashboardStore);
  });

  it('suma los kilómetros y cuenta las rutas activas', async () => {
    await loadWith([route('1', 'Costa', 'easy', 120), route('2', 'Costa', 'hard', 80, false)], []);

    expect(store.totalDistance()).toBe(200);
    expect(store.active()).toBe(1);
    expect(store.total()).toBe(2);
  });

  it('reparte las rutas por categoría (de más a menos) y por dificultad', async () => {
    await loadWith(
      [route('1', 'Montaña', 'easy', 10), route('2', 'Costa', 'hard', 10), route('3', 'Montaña', 'hard', 10)],
      [],
    );

    expect(store.byCategory()).toEqual([
      { label: 'Montaña', value: 2 },
      { label: 'Costa', value: 1 },
    ]);
    expect(store.byDifficulty().map((item) => item.value)).toEqual([1, 0, 2]);
  });

  it('con muchas categorías, a partir de la séptima se resumen sin barra', async () => {
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    await loadWith(names.map((name, index) => route(String(index), name, 'easy', 10)), []);

    expect(store.byCategory().length).toBe(6);
    expect(store.otherCategories()).toEqual({ count: 3, routes: 3 });
  });

  it('con pocas categorías no hay resumen', async () => {
    await loadWith([route('1', 'Costa', 'easy', 10)], []);
    expect(store.otherCategories()).toBeNull();
  });

  it('las próximas salidas son las programadas que no han empezado, con sus plazas y su precio medio', async () => {
    await loadWith(
      [route('1', 'Costa', 'easy', 10)],
      [
        departure('a', 10, 'scheduled', 8, 100),
        departure('b', 3, 'scheduled', 6, 50),
        departure('c', 5, 'cancelled', 20, 999),
        departure('d', -2, 'scheduled', 4, 10),
      ],
    );

    expect(store.upcoming().map((item) => item._id)).toEqual(['b', 'a']);
    expect(store.upcomingSeats()).toBe(14);
    expect(store.averagePrice()).toBe(75);
  });

  it('sin próximas salidas, el precio medio no se inventa', async () => {
    await loadWith([route('1', 'Costa', 'easy', 10)], []);
    expect(store.averagePrice()).toBeNull();
  });

  it('agrupa las salidas por mes y por estado, del mes actual a cinco meses vista', async () => {
    await loadWith([route('1', 'Costa', 'easy', 10)], [departure('a', 0, 'scheduled', 8, 100)]);

    const months = store.byMonth();
    expect(months.length).toBe(6);
    expect(months[0].values).toEqual({ scheduled: 1, completed: 0, cancelled: 0 });
  });
});
