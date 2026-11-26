import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ApiError } from '../../../core/models/api-error.model';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { NotificationService } from '../../../core/services/notification.service';
import { review } from '../testing';
import { ReviewsService } from './reviews.service';
import { ReviewsStore } from './reviews.store';

describe('ReviewsStore', () => {
  let api: jasmine.SpyObj<ReviewsService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let errors: jasmine.SpyObj<ErrorHandlerService>;
  let store: ReviewsStore;

  beforeEach(() => {
    api = jasmine.createSpyObj<ReviewsService>('api', ['getById', 'removePhoto', 'getTargetOptions']);
    notifications = jasmine.createSpyObj<NotificationService>('notifications', ['confirm', 'success']);
    notifications.success.and.resolveTo();
    errors = jasmine.createSpyObj<ErrorHandlerService>('errors', ['handle']);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ReviewsService, useValue: api },
        { provide: ErrorHandlerService, useValue: errors },
        { provide: NotificationService, useValue: notifications },
      ],
    });
    store = TestBed.inject(ReviewsStore);
  });

  it('se nombra por su título o, sin él, por quién la ha escrito', () => {
    expect(store.displayName(review())).toBe('Bonita ruta');
    expect(store.displayName(review({ title: null }))).toBe('Opinión de Laura Campos');
    expect(store.displayName(review({ title: '  ', user: null }))).toBe('Opinión de un usuario eliminado');
    expect(store.displayName(review({ title: 'muy '.repeat(30) })).length).toBeLessThanOrEqual(61);
  });

  it('quitar una foto pide confirmación y deja la opinión abierta sin ella', async () => {
    const before = review();
    api.getById.and.resolveTo(before);
    await store.getOne(before._id);

    notifications.confirm.and.resolveTo(true);
    const after = review({ photos: [before.photos[1]] });
    api.removePhoto.and.resolveTo(after);
    const result = await store.confirmAndRemovePhoto(before, before.photos[0]);

    expect(api.removePhoto).toHaveBeenCalledOnceWith(before._id, 'p1');
    expect(result?.ok).toBeTrue();
    expect(store.selected()?.photos.map((photo) => photo._id)).toEqual(['p2']);
    expect(notifications.success).toHaveBeenCalled();
  });

  it('si no se confirma, no se quita nada', async () => {
    notifications.confirm.and.resolveTo(false);
    expect(await store.confirmAndRemovePhoto(review(), review().photos[0])).toBeNull();
    expect(api.removePhoto).not.toHaveBeenCalled();
  });

  it('si la foto ya no estaba (404), se vuelve a pedir la opinión', async () => {
    const current = review();
    api.getById.and.resolveTo(current);
    await store.getOne(current._id);
    api.getById.calls.reset();

    notifications.confirm.and.resolveTo(true);
    api.removePhoto.and.rejectWith(new Error('404'));
    errors.handle.and.returnValue({ isNotFound: true } as ApiError);
    const result = await store.confirmAndRemovePhoto(current, current.photos[0]);

    expect(result?.ok).toBeFalse();
    expect(api.getById).toHaveBeenCalledOnceWith(current._id);
  });
});
