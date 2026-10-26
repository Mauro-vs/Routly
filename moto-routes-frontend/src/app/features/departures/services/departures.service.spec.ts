import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DeparturePayload } from '../../../core/models/departure.model';
import { ApiService } from '../../../core/services/api.service';
import { DeparturesService } from './departures.service';

const ID = '6abd589e3d6101dd2eb767e1';
const PAYLOAD: DeparturePayload = { experienceId: ID, startAt: '2026-11-08T06:00:00.000Z', endAt: '2026-11-08T11:00:00.000Z', capacity: 8, price: 89 };

/** Comprueba que cada método llama al endpoint real de la API (ver postman.md). */
describe('DeparturesService', () => {
  let service: DeparturesService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('api', ['get', 'post', 'patch']);
    api.get.and.resolveTo([]);
    api.post.and.resolveTo({});
    api.patch.and.resolveTo({});

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(DeparturesService);
  });

  it('GET /departures', async () => {
    await service.getAll();
    expect(api.get).toHaveBeenCalledOnceWith('/departures');
  });

  it('GET /departures/actives y /departures/inactives', async () => {
    await service.getByActive(true);
    await service.getByActive(false);
    expect(api.get.calls.allArgs()).toEqual([['/departures/actives'], ['/departures/inactives']]);
  });

  it('GET /departures/deleted', async () => {
    await service.getDeleted();
    expect(api.get).toHaveBeenCalledOnceWith('/departures/deleted');
  });

  it('GET /departures/:id', async () => {
    await service.getById(ID);
    expect(api.get).toHaveBeenCalledOnceWith(`/departures/${ID}`);
  });

  it('GET /departures/slug/:slug', async () => {
    await service.getBySlug('tramuntana-al-amanecer-2026-11-08-b8c950');
    expect(api.get).toHaveBeenCalledOnceWith('/departures/slug/tramuntana-al-amanecer-2026-11-08-b8c950');
  });

  it('POST /departures', async () => {
    await service.create(PAYLOAD);
    expect(api.post).toHaveBeenCalledOnceWith('/departures', PAYLOAD);
  });

  it('PATCH /departures/:id', async () => {
    await service.update(ID, {});
    expect(api.patch).toHaveBeenCalledOnceWith(`/departures/${ID}`, {});
  });

  it('PATCH /departures/:id/active', async () => {
    await service.setActive(ID, false);
    expect(api.patch).toHaveBeenCalledOnceWith(`/departures/${ID}/active`, { isActive: false });
  });

  it('PATCH /departures/:id/delete, sin cuerpo', async () => {
    await service.remove(ID);
    expect(api.patch).toHaveBeenCalledOnceWith(`/departures/${ID}/delete`);
  });

  it('PATCH /departures/:id/restore', async () => {
    await service.restore(ID, true);
    expect(api.patch).toHaveBeenCalledOnceWith(`/departures/${ID}/restore`, { isActive: true });
  });
});
