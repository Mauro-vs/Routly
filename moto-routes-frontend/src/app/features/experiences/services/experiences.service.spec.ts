import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ExperiencePayload } from '../../../core/models/experience.model';
import { ApiService } from '../../../core/services/api.service';
import { ExperiencesService } from './experiences.service';

const ID = '6abd589e3d6101dd2eb767e1';
const PAYLOAD: ExperiencePayload = { hostId: ID, routeId: ID, title: 'Tramuntana al amanecer', duration: 5, maxParticipants: 8 };

/** Comprueba que cada método llama al endpoint real de la API (ver postman.md). */
describe('ExperiencesService', () => {
  let service: ExperiencesService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('api', ['get', 'post', 'patch']);
    api.get.and.resolveTo([]);
    api.post.and.resolveTo({});
    api.patch.and.resolveTo({});

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(ExperiencesService);
  });

  it('GET /experiences', async () => {
    await service.getAll();
    expect(api.get).toHaveBeenCalledOnceWith('/experiences');
  });

  it('GET /experiences/actives y /experiences/inactives', async () => {
    await service.getByActive(true);
    await service.getByActive(false);
    expect(api.get.calls.allArgs()).toEqual([['/experiences/actives'], ['/experiences/inactives']]);
  });

  it('GET /experiences/deleted', async () => {
    await service.getDeleted();
    expect(api.get).toHaveBeenCalledOnceWith('/experiences/deleted');
  });

  it('GET /experiences/:id', async () => {
    await service.getById(ID);
    expect(api.get).toHaveBeenCalledOnceWith(`/experiences/${ID}`);
  });

  it('GET /experiences/slug/:slug', async () => {
    await service.getBySlug('tramuntana-al-amanecer-b8c940');
    expect(api.get).toHaveBeenCalledOnceWith('/experiences/slug/tramuntana-al-amanecer-b8c940');
  });

  it('POST /experiences', async () => {
    await service.create(PAYLOAD);
    expect(api.post).toHaveBeenCalledOnceWith('/experiences', PAYLOAD);
  });

  it('PATCH /experiences/:id', async () => {
    await service.update(ID, {});
    expect(api.patch).toHaveBeenCalledOnceWith(`/experiences/${ID}`, {});
  });

  it('PATCH /experiences/:id/active', async () => {
    await service.setActive(ID, false);
    expect(api.patch).toHaveBeenCalledOnceWith(`/experiences/${ID}/active`, { isActive: false });
  });

  it('PATCH /experiences/:id/delete, sin cuerpo', async () => {
    await service.remove(ID);
    expect(api.patch).toHaveBeenCalledOnceWith(`/experiences/${ID}/delete`);
  });

  it('PATCH /experiences/:id/restore', async () => {
    await service.restore(ID, true);
    expect(api.patch).toHaveBeenCalledOnceWith(`/experiences/${ID}/restore`, { isActive: true });
  });
});
