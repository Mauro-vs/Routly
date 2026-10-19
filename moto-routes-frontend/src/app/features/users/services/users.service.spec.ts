import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UserPayload } from '../../../core/models/user.model';
import { ApiService } from '../../../core/services/api.service';
import { UsersService } from './users.service';

const ID = '6abd589e3d6101dd2eb767e1';
const PAYLOAD: UserPayload = { name: 'Ana Ruiz', email: 'ana@routly.dev', password: 'una-contraseña' };

/** Comprueba que cada método llama al endpoint real de la API (ver postman.md). */
describe('UsersService', () => {
  let service: UsersService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('api', ['get', 'post', 'patch']);
    api.get.and.resolveTo([]);
    api.post.and.resolveTo({});
    api.patch.and.resolveTo({});

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(UsersService);
  });

  it('GET /users', async () => {
    await service.getAll();
    expect(api.get).toHaveBeenCalledOnceWith('/users');
  });

  it('GET /users/actives y /users/inactives', async () => {
    await service.getByActive(true);
    await service.getByActive(false);
    expect(api.get.calls.allArgs()).toEqual([['/users/actives'], ['/users/inactives']]);
  });

  it('GET /users/deleted', async () => {
    await service.getDeleted();
    expect(api.get).toHaveBeenCalledOnceWith('/users/deleted');
  });

  it('GET /users/:id', async () => {
    await service.getById(ID);
    expect(api.get).toHaveBeenCalledOnceWith(`/users/${ID}`);
  });

  it('GET /users/slug/:slug', async () => {
    await service.getBySlug('ana-ruiz-b8c910');
    expect(api.get).toHaveBeenCalledOnceWith('/users/slug/ana-ruiz-b8c910');
  });

  it('POST /users', async () => {
    await service.create(PAYLOAD);
    expect(api.post).toHaveBeenCalledOnceWith('/users', PAYLOAD);
  });

  it('PATCH /users/:id', async () => {
    await service.update(ID, {});
    expect(api.patch).toHaveBeenCalledOnceWith(`/users/${ID}`, {});
  });

  it('PATCH /users/:id/active', async () => {
    await service.setActive(ID, false);
    expect(api.patch).toHaveBeenCalledOnceWith(`/users/${ID}/active`, { isActive: false });
  });

  it('PATCH /users/:id/delete, sin cuerpo', async () => {
    await service.remove(ID);
    expect(api.patch).toHaveBeenCalledOnceWith(`/users/${ID}/delete`);
  });

  it('PATCH /users/:id/restore', async () => {
    await service.restore(ID, true);
    expect(api.patch).toHaveBeenCalledOnceWith(`/users/${ID}/restore`, { isActive: true });
  });
});
