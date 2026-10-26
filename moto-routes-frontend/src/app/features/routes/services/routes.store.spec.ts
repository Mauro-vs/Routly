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

  const titles = (): string[] => store.visible().map((item) => item.title);

  it('carga las categorías y ubicaciones activas para los selects', async () => {
    service.getCategoryOptions.and.resolveTo([]);
    service.getLocationOptions.and.resolveTo([]);
    await Promise.all([store.categoryOptions.load(), store.locationOptions.load()]);

    expect(service.getCategoryOptions).toHaveBeenCalledTimes(1);
    expect(service.getLocationOptions).toHaveBeenCalledTimes(1);
    expect(store.categoryOptions.loaded()).toBeTrue();
    expect(store.locationOptions.loading()).toBeFalse();
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

  it('publica el número de rutas para el contador del menú', () => {
    TestBed.tick();
    expect(TestBed.inject(NavBadgeService).count('routes')).toBe(3);
  });

  it('no deja restaurar una ruta cuya categoría o ubicación sigue en la papelera', () => {
    expect(store.restoreBlockedReason(ROUTES[0])).toBeNull();
    expect(store.restoreBlockedReason(route('5', { category: null }))).toBe(
      'No se puede restaurar mientras su categoría siga en la papelera.',
    );
    expect(store.restoreBlockedReason(route('6', { category: null, endLocation: null }))).toBe(
      'No se puede restaurar mientras su categoría y una de sus ubicaciones sigan en la papelera.',
    );
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
