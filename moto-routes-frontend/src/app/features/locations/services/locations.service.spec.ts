import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LocationPayload } from '../../../core/models/location.model';
import { ApiService } from '../../../core/services/api.service';
import { LocationsService } from './locations.service';

const ID = '6abd589e3d6101dd2eb767e1';
const PAYLOAD: LocationPayload = { city: 'Teruel', region: 'Aragón', latitude: 40.34, longitude: -1.1 };

/** Comprueba que cada método llama al endpoint real de la API (ver postman.md). */
describe('LocationsService', () => {
  let service: LocationsService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('api', ['get', 'post', 'patch']);
    api.get.and.resolveTo([]);
    api.post.and.resolveTo({});
    api.patch.and.resolveTo({});

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(LocationsService);
  });

  it('GET /locations', async () => {
    await service.getAll();
    expect(api.get).toHaveBeenCalledOnceWith('/locations');
  });

  it('GET /locations/actives y /locations/inactives', async () => {
    await service.getByActive(true);
    await service.getByActive(false);
    expect(api.get.calls.allArgs()).toEqual([['/locations/actives'], ['/locations/inactives']]);
  });

  it('GET /locations/deleted', async () => {
    await service.getDeleted();
    expect(api.get).toHaveBeenCalledOnceWith('/locations/deleted');
  });

  it('GET /locations/:id', async () => {
    await service.getById(ID);
    expect(api.get).toHaveBeenCalledOnceWith(`/locations/${ID}`);
  });

  it('GET /locations/slug/:slug', async () => {
    await service.getBySlug('teruel-b8c920');
    expect(api.get).toHaveBeenCalledOnceWith('/locations/slug/teruel-b8c920');
  });

  it('POST /locations', async () => {
    await service.create(PAYLOAD);
    expect(api.post).toHaveBeenCalledOnceWith('/locations', PAYLOAD);
  });

  it('PATCH /locations/:id', async () => {
    await service.update(ID, {});
    expect(api.patch).toHaveBeenCalledOnceWith(`/locations/${ID}`, {});
  });

  it('PATCH /locations/:id/active', async () => {
    await service.setActive(ID, false);
    expect(api.patch).toHaveBeenCalledOnceWith(`/locations/${ID}/active`, { isActive: false });
  });

  it('PATCH /locations/:id/delete, sin cuerpo', async () => {
    await service.remove(ID);
    expect(api.patch).toHaveBeenCalledOnceWith(`/locations/${ID}/delete`);
  });

  it('PATCH /locations/:id/restore', async () => {
    await service.restore(ID, true);
    expect(api.patch).toHaveBeenCalledOnceWith(`/locations/${ID}/restore`, { isActive: true });
  });
});
