import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LocationSummary } from '../../../core/models/location.model';
import { Route } from '../../../core/models/route.model';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { NavBadgeService } from '../../../core/services/nav-badge.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RoutesService } from './routes.service';
import { RoutesStore } from './routes.store';

function place(city: string): LocationSummary {
  return { _id: `loc-${city}`, city, country: 'España', slug: city.toLowerCase() };
}

type RouteFixture = Partial<Route> & { from?: string; to?: string };

function route(id: string, { from = 'Origen', to = 'Destino', ...overrides }: RouteFixture = {}): Route {
  return {
    _id: id,
    slug: `ruta-${id}`,
    title: `Ruta ${id}`,
    difficulty: 'easy',
    distance: 100,
    duration: 2,
    categoryId: 'cat-1',
    category: { _id: 'cat-1', name: 'Montaña', slug: 'montana' },
    startLocationId: `loc-${from}`,
    startLocation: place(from),
    endLocationId: `loc-${to}`,
    endLocation: place(to),
    status: 'active',
    isActive: true,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const ROUTES: Route[] = [
  route('1', { title: 'Pirineos Adventure', difficulty: 'hard', from: 'Huesca', to: 'Lleida' }),
  route('2', { title: 'Ruta del Vino', from: 'Logroño', to: 'Haro', isActive: false, status: 'inactive' }),
  route('3', {
    title: 'Costa Brava Loop',
    difficulty: 'medium',
    from: 'Barcelona',
    to: 'Barcelona',
    category: { _id: 'cat-2', name: 'Costa', slug: 'costa' },
  }),
];

describe('RoutesStore', () => {
  let store: RoutesStore;
  let service: jasmine.SpyObj<RoutesService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    localStorage.removeItem('routly.routes.view');
    service = jasmine.createSpyObj<RoutesService>('service', [
      'getAll',
      'getByActive',
      'remove',
      'restore',
      'getCategoryOptions',
      'getLocationOptions',
    ]);
    service.getAll.and.resolveTo(ROUTES);
    service.getByActive.and.callFake((isActive: boolean) =>
      Promise.resolve(ROUTES.filter((item) => item.isActive === isActive)),
    );
    notifications = jasmine.createSpyObj<NotificationService>('notifications', [
      'confirm',
      'undoable',
      'success',
    ]);
    notifications.success.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: RoutesService, useValue: service },
        { provide: NotificationService, useValue: notifications },
        { provide: ErrorHandlerService, useValue: jasmine.createSpyObj('errors', ['handle']) },
      ],
    });
    store = TestBed.inject(RoutesStore);
    await store.load();
  });

  const titles = (): string[] => store.filtered().map((item) => item.title);

  it('sin filtros muestra todas las rutas', () => {
    expect(titles().length).toBe(3);
    expect(store.hasFilters()).toBeFalse();
  });

  it('busca en título, origen, destino y categoría sin distinguir tildes ni mayúsculas', () => {
    store.search.set('logrono');
    expect(titles()).toEqual(['Ruta del Vino']);

    store.search.set('LLEIDA');
    expect(titles()).toEqual(['Pirineos Adventure']);

    store.search.set('costa');
    expect(titles()).toEqual(['Costa Brava Loop']);
  });

  it('busca aunque una ubicación ya no exista', async () => {
    service.getAll.and.resolveTo([route('4', { title: 'Huérfana', startLocation: null })]);
    await store.load();

    store.search.set('eliminada');
    expect(titles()).toEqual(['Huérfana']);
  });

  it('carga las categorías y ubicaciones activas para los selects', async () => {
    service.getCategoryOptions.and.resolveTo([]);
    service.getLocationOptions.and.resolveTo([]);

    await store.loadOptions();

    expect(service.getCategoryOptions).toHaveBeenCalledTimes(1);
    expect(service.getLocationOptions).toHaveBeenCalledTimes(1);
    expect(store.optionsLoaded()).toBeTrue();
    expect(store.optionsLoading()).toBeFalse();
  });

  it('combina el filtro por estado con el de dificultad', () => {
    store.status.set('active');
    store.difficulty.set('medium');
    expect(titles()).toEqual(['Costa Brava Loop']);
  });

  it('setStatus filtra al instante y lo confirma con el endpoint de ese estado', () => {
    store.setStatus('inactive');
    expect(titles()).toEqual(['Ruta del Vino']);
    expect(service.getByActive).toHaveBeenCalledOnceWith(false);

    store.setStatus('active');
    expect(service.getByActive).toHaveBeenCalledWith(true);

    store.setStatus('all');
    expect(service.getAll).toHaveBeenCalledTimes(2);
  });

  it('clearFilters lo deja todo como al entrar', () => {
    store.search.set('x');
    store.setStatus('inactive');
    store.difficulty.set('hard');

    store.clearFilters();

    expect(store.hasFilters()).toBeFalse();
    expect(titles().length).toBe(3);
  });

  it('publica el número de rutas para el contador del menú', () => {
    TestBed.tick();
    expect(TestBed.inject(NavBadgeService).count('routes')).toBe(3);
  });

  it('recuerda la vista elegida', () => {
    store.view.set('table');
    TestBed.tick();
    expect(localStorage.getItem('routly.routes.view')).toBe('table');
  });

  describe('confirmAndRemove', () => {
    it('no elimina si se cancela la confirmación', async () => {
      notifications.confirm.and.resolveTo(false);

      expect(await store.confirmAndRemove(ROUTES[0])).toBeFalse();
      expect(service.remove).not.toHaveBeenCalled();
    });

    it('elimina y, si se pulsa deshacer, restaura la ruta', async () => {
      notifications.confirm.and.resolveTo(true);
      notifications.undoable.and.resolveTo(true);
      service.remove.and.resolveTo();
      service.restore.and.resolveTo(ROUTES[0]);

      expect(await store.confirmAndRemove(ROUTES[0])).toBeTrue();
      expect(store.total()).toBe(2);

      // El aviso de deshacer sigue su curso sin bloquear a quien llamó.
      await new Promise((resolve) => setTimeout(resolve));
      expect(service.restore).toHaveBeenCalledOnceWith('1', true);
      expect(store.total()).toBe(3);
    });
  });
});
