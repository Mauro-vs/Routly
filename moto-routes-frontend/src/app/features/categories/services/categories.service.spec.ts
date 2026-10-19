import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CategoryPayload } from '../../../core/models/category.model';
import { ApiService } from '../../../core/services/api.service';
import { CategoriesService } from './categories.service';

const ID = '6abd589e3d6101dd2eb767e1';
const PAYLOAD: CategoryPayload = { name: 'Urbana' };

/** Comprueba que cada método llama al endpoint real de la API (ver postman.md). */
describe('CategoriesService', () => {
  let service: CategoriesService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('api', ['get', 'post', 'patch']);
    api.get.and.resolveTo([]);
    api.post.and.resolveTo({});
    api.patch.and.resolveTo({});

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(CategoriesService);
  });

  it('GET /categories', async () => {
    await service.getAll();
    expect(api.get).toHaveBeenCalledOnceWith('/categories');
  });

  it('GET /categories/actives y /categories/inactives', async () => {
    await service.getByActive(true);
    await service.getByActive(false);
    expect(api.get.calls.allArgs()).toEqual([['/categories/actives'], ['/categories/inactives']]);
  });

  it('GET /categories/deleted', async () => {
    await service.getDeleted();
    expect(api.get).toHaveBeenCalledOnceWith('/categories/deleted');
  });

  it('GET /categories/:id', async () => {
    await service.getById(ID);
    expect(api.get).toHaveBeenCalledOnceWith(`/categories/${ID}`);
  });

  it('GET /categories/slug/:slug', async () => {
    await service.getBySlug('urbana-b8c930');
    expect(api.get).toHaveBeenCalledOnceWith('/categories/slug/urbana-b8c930');
  });

  it('POST /categories', async () => {
    await service.create(PAYLOAD);
    expect(api.post).toHaveBeenCalledOnceWith('/categories', PAYLOAD);
  });

  it('PATCH /categories/:id', async () => {
    await service.update(ID, {});
    expect(api.patch).toHaveBeenCalledOnceWith(`/categories/${ID}`, {});
  });

  it('PATCH /categories/:id/active', async () => {
    await service.setActive(ID, false);
    expect(api.patch).toHaveBeenCalledOnceWith(`/categories/${ID}/active`, { isActive: false });
  });

  it('PATCH /categories/:id/delete, sin cuerpo', async () => {
    await service.remove(ID);
    expect(api.patch).toHaveBeenCalledOnceWith(`/categories/${ID}/delete`);
  });

  it('PATCH /categories/:id/restore', async () => {
    await service.restore(ID, true);
    expect(api.patch).toHaveBeenCalledOnceWith(`/categories/${ID}/restore`, { isActive: true });
  });
});
