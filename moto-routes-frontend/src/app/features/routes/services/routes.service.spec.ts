import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { RoutePayload } from '../../../core/models/route.model';
import { ApiService } from '../../../core/services/api.service';
import { RoutesService } from './routes.service';

const ID = '6abd589e3d6101dd2eb767e1';
const PAYLOAD: RoutePayload = {
  title: 'Ruta del Cañón',
  description: '',
  difficulty: 'hard',
  distance: 250,
  duration: 6,
  categoryId: '6710a1b2c3d4e5f6a7b8c930',
  startLocationId: '6710a1b2c3d4e5f6a7b8c921',
  endLocationId: '6710a1b2c3d4e5f6a7b8c920',
};

/** Comprueba que cada método llama al endpoint real de la API (ver postman.md). */
describe('RoutesService', () => {
  let service: RoutesService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('api', ['get', 'post', 'patch']);
    api.get.and.resolveTo([]);
    api.post.and.resolveTo({});
    api.patch.and.resolveTo({});

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(RoutesService);
  });

  it('GET /routes', async () => {
    await service.getAll();
    expect(api.get).toHaveBeenCalledOnceWith('/routes');
  });

  it('GET /routes/actives y /routes/inactives', async () => {
    await service.getActives();
    await service.getInactives();
    expect(api.get.calls.allArgs()).toEqual([['/routes/actives'], ['/routes/inactives']]);
  });

  it('getByActive elige el endpoint según el estado', async () => {
    await service.getByActive(true);
    await service.getByActive(false);
    expect(api.get.calls.allArgs()).toEqual([['/routes/actives'], ['/routes/inactives']]);
  });

  it('GET /routes/deleted', async () => {
    await service.getDeleted();
    expect(api.get).toHaveBeenCalledOnceWith('/routes/deleted');
  });

  it('GET /routes/:id', async () => {
    await service.getById(ID);
    expect(api.get).toHaveBeenCalledOnceWith(`/routes/${ID}`);
  });

  it('GET /routes/slug/:slug', async () => {
    await service.getBySlug('ruta-del-canon-fcb51c');
    expect(api.get).toHaveBeenCalledOnceWith('/routes/slug/ruta-del-canon-fcb51c');
  });

  it('POST /routes', async () => {
    await service.create(PAYLOAD);
    expect(api.post).toHaveBeenCalledOnceWith('/routes', PAYLOAD);
  });

  it('PATCH /routes/:id', async () => {
    await service.update(ID, { distance: 200 });
    expect(api.patch).toHaveBeenCalledOnceWith(`/routes/${ID}`, { distance: 200 });
  });

  it('PATCH /routes/:id/active', async () => {
    await service.setActive(ID, false);
    expect(api.patch).toHaveBeenCalledOnceWith(`/routes/${ID}/active`, { isActive: false });
  });

  it('PATCH /routes/:id/delete, sin cuerpo', async () => {
    await service.remove(ID);
    expect(api.patch).toHaveBeenCalledOnceWith(`/routes/${ID}/delete`);
  });

  it('opciones del formulario: GET /categories/actives y /locations/actives', async () => {
    await service.getCategoryOptions();
    await service.getLocationOptions();
    expect(api.get.calls.allArgs()).toEqual([['/categories/actives'], ['/locations/actives']]);
  });

  it('PATCH /routes/:id/restore', async () => {
    await service.restore(ID, true);
    expect(api.patch).toHaveBeenCalledOnceWith(`/routes/${ID}/restore`, { isActive: true });
  });
});
