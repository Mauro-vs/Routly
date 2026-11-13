import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Image } from '../../../core/models/image.model';
import { ApiService } from '../../../core/services/api.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { NotificationService } from '../../../core/services/notification.service';
import { toApiError } from '../../../core/utils/api-error.mapper';
import { ImageGalleryComponent } from './image-gallery.component';

function image(id: string, position: number, fields: Partial<Image> = {}): Image {
  return {
    _id: id,
    ownerType: 'route',
    ownerId: 'r1',
    url: `https://img.routly.dev/${id}.jpg`,
    alt: `Foto ${id}`,
    position,
    isCover: false,
    status: 'active',
    isActive: true,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...fields,
  };
}

describe('ImageGalleryComponent', () => {
  let fixture: ComponentFixture<ImageGalleryComponent>;
  let element: HTMLElement;
  let api: jasmine.SpyObj<ApiService>;
  let gallery: Image[];

  beforeEach(async () => {
    gallery = [
      image('a', 0, { isCover: true }),
      image('b', 1),
      image('c', 2, { isActive: false, status: 'inactive' }),
    ];
    api = jasmine.createSpyObj<ApiService>('api', ['get', 'post', 'patch']);
    api.get.and.callFake(async () => structuredClone(gallery) as never);
    api.patch.and.resolveTo(null as never);
    api.post.and.resolveTo(null as never);
    const errors = jasmine.createSpyObj<ErrorHandlerService>('errors', ['handle']);
    errors.handle.and.callFake((error: unknown) => toApiError(error));
    const notifications = jasmine.createSpyObj<NotificationService>('notifications', [
      'success',
      'errorToast',
      'confirm',
      'undoable',
    ]);
    notifications.success.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ApiService, useValue: api },
        { provide: ErrorHandlerService, useValue: errors },
        { provide: NotificationService, useValue: notifications },
      ],
    });
    fixture = TestBed.createComponent(ImageGalleryComponent);
    fixture.componentRef.setInput('ownerType', 'route');
    fixture.componentRef.setInput('ownerId', 'r1');
    fixture.componentRef.setInput('ownerLabel', 'Costa Brava');
    await fixture.whenStable();
    element = fixture.nativeElement;
  });

  const button = (label: string): HTMLButtonElement =>
    element.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;

  it('pide la galería de su dueño y marca la principal y las inactivas', () => {
    expect(api.get).toHaveBeenCalledWith('/images', { params: { ownerType: 'route', ownerId: 'r1' } });
    const tiles = element.querySelectorAll('li.tile');
    expect(tiles.length).toBe(3);
    expect(tiles[0].textContent).toContain('Principal');
    expect(tiles[2].textContent).toContain('Inactiva');
  });

  it('una imagen inactiva no se puede marcar como principal, y lo explica', async () => {
    const cover = button('Marcar como principal: Foto c');
    expect(cover.getAttribute('aria-disabled')).toBe('true');

    cover.click();
    await fixture.whenStable();
    expect(api.patch).not.toHaveBeenCalled();

    const tip = element.querySelector(`#${cover.getAttribute('aria-describedby')}`);
    expect(tip?.textContent?.trim()).toBe('Una imagen inactiva no puede ser la principal.');
  });

  it('marcar otra como principal la actualiza y avisa del cambio de portada', async () => {
    const coverChanged = jasmine.createSpy('coverChange');
    fixture.componentInstance.coverChange.subscribe(coverChanged);
    api.patch.and.callFake(async () => {
      gallery = gallery.map((item) => ({ ...item, isCover: item._id === 'b' }));
      return null as never;
    });

    button('Marcar como principal: Foto b').click();
    await fixture.whenStable();

    expect(api.patch).toHaveBeenCalledOnceWith('/images/b', { isCover: true });
    expect(coverChanged).toHaveBeenCalledTimes(1);
  });

  it('bajar una imagen reescribe las posiciones que cambian', async () => {
    button('Bajar: Foto a').click();
    await fixture.whenStable();

    expect(api.patch.calls.allArgs()).toEqual([
      ['/images/b', { position: 0 }],
      ['/images/a', { position: 1 }],
    ]);
  });

  it('la primera no se puede subir ni la última bajar', () => {
    expect(button('Subir: Foto a').disabled).toBeTrue();
    expect(button('Bajar: Foto c').disabled).toBeTrue();
  });

  it('añadir pide una URL completa y envía la imagen de su dueño', async () => {
    const url = element.querySelector<HTMLInputElement>('[name="url"]')!;
    const form = element.querySelector<HTMLFormElement>('form.add')!;

    url.value = 'foto.jpg';
    url.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(api.post).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Escribe una dirección completa');

    url.value = 'https://img.routly.dev/nueva.jpg';
    url.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(api.post).toHaveBeenCalledOnceWith('/images', {
      ownerType: 'route',
      ownerId: 'r1',
      url: 'https://img.routly.dev/nueva.jpg',
    });
  });
});
