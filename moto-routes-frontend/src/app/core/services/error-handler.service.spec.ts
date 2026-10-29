import { ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ApiError, ApiErrorType } from '../models/api-error.model';
import { ErrorHandlerService } from './error-handler.service';
import { NotificationService } from './notification.service';

function apiError(type: ApiErrorType, status: number): ApiError {
  return new ApiError({ status, type, message: `mensaje ${type}` });
}

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let notifications: jasmine.SpyObj<NotificationService>;
  let router: jasmine.SpyObj<Router>;
  let fallback: jasmine.SpyObj<ErrorHandler>;

  beforeEach(() => {
    notifications = jasmine.createSpyObj<NotificationService>('notifications', [
      'error',
      'errorToast',
      'warning',
    ]);
    notifications.error.and.resolveTo();
    notifications.errorToast.and.resolveTo();
    notifications.warning.and.resolveTo();
    router = jasmine.createSpyObj<Router>('router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);
    fallback = jasmine.createSpyObj<ErrorHandler>('fallback', ['handleError']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: NotificationService, useValue: notifications },
        { provide: Router, useValue: router },
        { provide: ErrorHandler, useValue: fallback },
      ],
    });
    service = TestBed.inject(ErrorHandlerService);
  });

  it('un 401 o un 403 al cargar una página no lleva aviso: ya lo explica su recuadro', () => {
    for (const status of [401, 403]) {
      const result = service.handle(apiError('client', status), { pageLoad: true });
      expect(result.status).toBe(status);
    }
    expect(notifications.errorToast).not.toHaveBeenCalled();
  });

  it('en una acción (guardar, eliminar...) un 401 o un 403 sí lleva aviso', () => {
    service.handle(apiError('client', 401));
    service.handle(apiError('client', 403));
    expect(notifications.errorToast).toHaveBeenCalledTimes(2);
  });

  it('pageLoad no silencia otros errores de cliente', () => {
    service.handle(apiError('client', 418), { pageLoad: true });
    expect(notifications.errorToast).toHaveBeenCalledOnceWith('mensaje client');
  });

  const globalCases: Array<[ApiErrorType, number, string]> = [
    ['network', 0, 'Sin conexión con la API'],
    ['timeout', 0, 'La API no responde'],
    ['server', 500, 'Error del servidor'],
  ];

  for (const [type, status, title] of globalCases) {
    it(`muestra un diálogo ante un error de tipo ${type}`, () => {
      service.handle(apiError(type, status));
      expect(notifications.error).toHaveBeenCalledOnceWith(`mensaje ${type}`, title);
    });
  }

  it('no apila diálogos si fallan varias peticiones a la vez', () => {
    notifications.error.and.returnValue(new Promise<void>(() => undefined));

    service.handle(apiError('network', 0));
    service.handle(apiError('network', 0));

    expect(notifications.error).toHaveBeenCalledTimes(1);
  });

  it('ante un 404 avisa y vuelve al listado', () => {
    service.handle(apiError('client', 404), {
      notFoundRedirect: '/routes',
      notFoundMessage: 'Esa ruta ya no existe.',
    });

    expect(notifications.warning).toHaveBeenCalledOnceWith('Esa ruta ya no existe.');
    expect(router.navigateByUrl.calls.mostRecent().args[0]).toBe('/routes');
  });

  it('deja al formulario los errores de validación y de duplicado', () => {
    service.handle(apiError('validation', 400), { inline: true });
    service.handle(apiError('client', 409), { inline: true });

    expect(notifications.errorToast).not.toHaveBeenCalled();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('avisa de un error de validación cuando nadie lo pinta en línea', () => {
    service.handle(apiError('validation', 400));
    expect(notifications.errorToast).toHaveBeenCalledOnceWith('mensaje validation');
  });

  it('informa a Angular de los errores que no vienen de la API', () => {
    const bug = new TypeError('boom');
    const result = service.handle(bug);

    expect(fallback.handleError).toHaveBeenCalledOnceWith(bug);
    expect(result).toBeInstanceOf(ApiError);
  });
});
