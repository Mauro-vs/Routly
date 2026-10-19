import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { RolePayload } from '../../../core/models/role.model';
import { ApiService } from '../../../core/services/api.service';
import { RolesService } from './roles.service';

const ID = '6abd589e3d6101dd2eb767e1';
const PAYLOAD: RolePayload = { name: 'editor', label: 'Editor' };

/** Comprueba que cada método llama al endpoint real de la API (ver postman.md). */
describe('RolesService', () => {
  let service: RolesService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('api', ['get', 'post', 'patch']);
    api.get.and.resolveTo([]);
    api.post.and.resolveTo({});
    api.patch.and.resolveTo({});

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(RolesService);
  });

  it('GET /roles', async () => {
    await service.getAll();
    expect(api.get).toHaveBeenCalledOnceWith('/roles');
  });

  it('GET /roles/actives y /roles/inactives', async () => {
    await service.getByActive(true);
    await service.getByActive(false);
    expect(api.get.calls.allArgs()).toEqual([['/roles/actives'], ['/roles/inactives']]);
  });

  it('GET /roles/deleted', async () => {
    await service.getDeleted();
    expect(api.get).toHaveBeenCalledOnceWith('/roles/deleted');
  });

  it('GET /roles/:id', async () => {
    await service.getById(ID);
    expect(api.get).toHaveBeenCalledOnceWith(`/roles/${ID}`);
  });

  it('GET /roles/slug/:slug', async () => {
    await service.getBySlug('editor-b8c901');
    expect(api.get).toHaveBeenCalledOnceWith('/roles/slug/editor-b8c901');
  });

  it('POST /roles', async () => {
    await service.create(PAYLOAD);
    expect(api.post).toHaveBeenCalledOnceWith('/roles', PAYLOAD);
  });

  it('PATCH /roles/:id', async () => {
    await service.update(ID, {});
    expect(api.patch).toHaveBeenCalledOnceWith(`/roles/${ID}`, {});
  });

  it('PATCH /roles/:id/active', async () => {
    await service.setActive(ID, false);
    expect(api.patch).toHaveBeenCalledOnceWith(`/roles/${ID}/active`, { isActive: false });
  });

  it('PATCH /roles/:id/delete, sin cuerpo', async () => {
    await service.remove(ID);
    expect(api.patch).toHaveBeenCalledOnceWith(`/roles/${ID}/delete`);
  });

  it('PATCH /roles/:id/restore', async () => {
    await service.restore(ID, true);
    expect(api.patch).toHaveBeenCalledOnceWith(`/roles/${ID}/restore`, { isActive: true });
  });
});
