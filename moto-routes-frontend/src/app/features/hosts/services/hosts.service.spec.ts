import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HostPayload } from '../../../core/models/host.model';
import { ApiService } from '../../../core/services/api.service';
import { HostsService } from './hosts.service';

const ID = '6abd589e3d6101dd2eb767e1';
const PAYLOAD: HostPayload = { userId: ID, name: 'Lucía Ferrer' };

/** Comprueba que cada método llama al endpoint real de la API (ver postman.md). */
describe('HostsService', () => {
  let service: HostsService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('api', ['get', 'post', 'patch']);
    api.get.and.resolveTo([]);
    api.post.and.resolveTo({});
    api.patch.and.resolveTo({});

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(HostsService);
  });

  it('GET /hosts', async () => {
    await service.getAll();
    expect(api.get).toHaveBeenCalledOnceWith('/hosts');
  });

  it('GET /hosts/actives y /hosts/inactives', async () => {
    await service.getByActive(true);
    await service.getByActive(false);
    expect(api.get.calls.allArgs()).toEqual([['/hosts/actives'], ['/hosts/inactives']]);
  });

  it('GET /hosts/deleted', async () => {
    await service.getDeleted();
    expect(api.get).toHaveBeenCalledOnceWith('/hosts/deleted');
  });

  it('GET /hosts/:id', async () => {
    await service.getById(ID);
    expect(api.get).toHaveBeenCalledOnceWith(`/hosts/${ID}`);
  });

  it('GET /hosts/slug/:slug', async () => {
    await service.getBySlug('lucia-ferrer-b8c915');
    expect(api.get).toHaveBeenCalledOnceWith('/hosts/slug/lucia-ferrer-b8c915');
  });

  it('POST /hosts', async () => {
    await service.create(PAYLOAD);
    expect(api.post).toHaveBeenCalledOnceWith('/hosts', PAYLOAD);
  });

  it('PATCH /hosts/:id', async () => {
    await service.update(ID, {});
    expect(api.patch).toHaveBeenCalledOnceWith(`/hosts/${ID}`, {});
  });

  it('PATCH /hosts/:id/active', async () => {
    await service.setActive(ID, false);
    expect(api.patch).toHaveBeenCalledOnceWith(`/hosts/${ID}/active`, { isActive: false });
  });

  it('PATCH /hosts/:id/delete, sin cuerpo', async () => {
    await service.remove(ID);
    expect(api.patch).toHaveBeenCalledOnceWith(`/hosts/${ID}/delete`);
  });

  it('PATCH /hosts/:id/restore', async () => {
    await service.restore(ID, true);
    expect(api.patch).toHaveBeenCalledOnceWith(`/hosts/${ID}/restore`, { isActive: true });
  });
});
