import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { Bike } from '../../../core/models/bike.model';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionResetService } from '../../../core/services/session-reset.service';
import { GarageStore } from './bikes.store';

const BASE = environment.apiUrl;

function bike(id: string, extra: Partial<Bike> = {}): Bike {
  return {
    _id: id,
    userId: 'u1',
    brand: 'Honda',
    model: `Modelo ${id}`,
    type: 'naked',
    license: 'A2',
    modifications: [],
    isPrimary: false,
    isPublic: true,
    slug: `moto-${id}`,
    status: 'active',
    isActive: true,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  };
}

describe('GarageStore', () => {
  let store: GarageStore;
  let http: HttpTestingController;
  let notifications: jasmine.SpyObj<NotificationService>;

  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

  async function loadWith(bikes: Bike[]): Promise<void> {
    const loading = store.load();
    http.expectOne(`${BASE}/profile/me/bikes`).flush(bikes);
    await loading;
  }

  beforeEach(() => {
    notifications = jasmine.createSpyObj<NotificationService>('notifications', ['success', 'errorToast', 'warning', 'error']);
    notifications.success.and.resolveTo();
    notifications.errorToast.and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    store = TestBed.inject(GarageStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lee mi garaje, no todas las motos', async () => {
    await loadWith([bike('1')]);

    expect(store.total()).toBe(1);
  });

  it('marcar como principal envía solo eso y vuelve a pedir el listado', async () => {
    await loadWith([bike('1', { isPrimary: true }), bike('2')]);

    const marking = store.setPrimary(bike('2'));
    const request = http.expectOne({ method: 'PATCH', url: `${BASE}/bikes/2` });
    expect(request.request.body).toEqual({ isPrimary: true });
    request.flush(bike('2', { isPrimary: true }));
    await settle();

    http.expectOne(`${BASE}/profile/me/bikes`).flush([bike('2', { isPrimary: true }), bike('1')]);
    await marking;

    expect(store.items()[0]?._id).toBe('2');
    expect(notifications.success).toHaveBeenCalled();
  });

  it('la moto en uso no se puede hacer privada: se avisa en español', async () => {
    await loadWith([bike('1')]);

    const changing = store.setPublic(bike('1'), false);
    http
      .expectOne(`${BASE}/bikes/1`)
      .flush(
        { message: 'Bike is the guide bike of an active experience or an upcoming departure' },
        { status: 409, statusText: 'Conflict' },
      );
    await changing;

    expect(notifications.errorToast).toHaveBeenCalledOnceWith(
      'Esta moto guía una experiencia activa o una salida próxima. Cámbiala allí primero.',
    );
    expect(store.items()[0]?.isPublic).toBeTrue();
  });

  it('con 10 motos no se pueden añadir más', async () => {
    await loadWith(Array.from({ length: 9 }, (_, index) => bike(String(index))));
    expect(store.atLimit()).toBeFalse();

    await loadWith(Array.from({ length: 10 }, (_, index) => bike(String(index))));
    expect(store.atLimit()).toBeTrue();
  });

  it('se vacía al cerrar sesión', async () => {
    await loadWith([bike('1')]);

    TestBed.inject(SessionResetService).resetAll();

    expect(store.items()).toEqual([]);
    expect(store.loaded()).toBeFalse();
  });
});
