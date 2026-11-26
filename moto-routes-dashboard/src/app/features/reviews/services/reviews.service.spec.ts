import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ApiService } from '../../../core/services/api.service';
import { ReviewsService } from './reviews.service';

const ID = '6abd589e3d6101dd2eb76701';

/** Comprueba que cada método llama al endpoint real de la API. */
describe('ReviewsService', () => {
  let service: ReviewsService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('api', ['get', 'patch', 'delete']);
    api.get.and.resolveTo([]);
    api.patch.and.resolveTo({});
    api.delete.and.resolveTo({});
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(ReviewsService);
  });

  it('PATCH /reviews/:id/active para ocultar o mostrar', async () => {
    await service.setActive(ID, false);
    expect(api.patch).toHaveBeenCalledOnceWith(`/reviews/${ID}/active`, { isActive: false });
  });

  it('DELETE /reviews/:id/photos/:photoId para quitar una foto', async () => {
    await service.removePhoto(ID, 'p1');
    expect(api.delete).toHaveBeenCalledOnceWith(`/reviews/${ID}/photos/p1`);
  });

  it('las opciones del filtro "Sobre": experiencias y anfitriones, con su tipo', async () => {
    api.get.and.callFake(((path: string) =>
      Promise.resolve(
        path === '/experiences' ? [{ _id: 'e1', title: 'Calas de Mallorca' }] : [{ _id: 'h1', name: 'Lucía Ferrer' }],
      )) as never);
    const options = await service.getTargetOptions();
    expect(api.get).toHaveBeenCalledWith('/experiences');
    expect(api.get).toHaveBeenCalledWith('/hosts');
    expect(options).toEqual([
      { _id: 'e1', name: 'Calas de Mallorca', type: 'experience' },
      { _id: 'h1', name: 'Lucía Ferrer', type: 'host' },
    ]);
  });
});
