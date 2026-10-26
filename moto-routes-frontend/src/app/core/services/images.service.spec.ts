import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ImagePayload } from '../models/image.model';
import { ApiService } from './api.service';
import { ImagesService } from './images.service';

const ID = '6abd589e3d6101dd2eb767e1';
const PAYLOAD: ImagePayload = { ownerType: 'route', ownerId: ID, url: 'https://example.com/foto.jpg' };

/** Comprueba que cada método llama al endpoint real de la API (ver postman.md). */
describe('ImagesService', () => {
  let service: ImagesService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('api', ['get', 'post', 'patch']);
    api.get.and.resolveTo([]);
    api.post.and.resolveTo({});
    api.patch.and.resolveTo({});

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(ImagesService);
  });

  it('GET /images', async () => {
    await service.getAll();
    expect(api.get).toHaveBeenCalledOnceWith('/images');
  });

  it('GET /images/actives y /images/inactives', async () => {
    await service.getByActive(true);
    await service.getByActive(false);
    expect(api.get.calls.allArgs()).toEqual([['/images/actives'], ['/images/inactives']]);
  });

  it('GET /images/deleted', async () => {
    await service.getDeleted();
    expect(api.get).toHaveBeenCalledOnceWith('/images/deleted');
  });

  it('GET /images/:id', async () => {
    await service.getById(ID);
    expect(api.get).toHaveBeenCalledOnceWith(`/images/${ID}`);
  });

  it('no tiene getBySlug: las imágenes no tienen slug', () => {
    expect('getBySlug' in service).toBeFalse();
  });

  it('GET /images?ownerType=&ownerId=', async () => {
    await service.getByOwner('route', ID);
    expect(api.get).toHaveBeenCalledOnceWith('/images', { params: { ownerType: 'route', ownerId: ID } });
  });

  it('POST /images', async () => {
    await service.create(PAYLOAD);
    expect(api.post).toHaveBeenCalledOnceWith('/images', PAYLOAD);
  });

  it('PATCH /images/:id', async () => {
    await service.update(ID, {});
    expect(api.patch).toHaveBeenCalledOnceWith(`/images/${ID}`, {});
  });

  it('PATCH /images/:id/active', async () => {
    await service.setActive(ID, false);
    expect(api.patch).toHaveBeenCalledOnceWith(`/images/${ID}/active`, { isActive: false });
  });

  it('PATCH /images/:id/delete, sin cuerpo', async () => {
    await service.remove(ID);
    expect(api.patch).toHaveBeenCalledOnceWith(`/images/${ID}/delete`);
  });

  it('PATCH /images/:id/restore', async () => {
    await service.restore(ID, true);
    expect(api.patch).toHaveBeenCalledOnceWith(`/images/${ID}/restore`, { isActive: true });
  });
});
