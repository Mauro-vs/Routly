import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, convertToParamMap, provideRouter } from '@angular/router';

import { ApiService } from '../services/api.service';
import { ErrorHandlerService } from '../services/error-handler.service';
import { recordByIdGuard } from './record-by-id.guard';

describe('recordByIdGuard', () => {
  let api: jasmine.SpyObj<ApiService>;
  let errors: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    errors = jasmine.createSpyObj<ErrorHandlerService>('ErrorHandlerService', ['handle']);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ApiService, useValue: api },
        { provide: ErrorHandlerService, useValue: errors },
      ],
    });
  });

  // /users/id/abc: el primer tramo es la colección
  const route = {
    pathFromRoot: [{ url: [] }, { url: [{ path: 'users' }] }, { url: [{ path: 'id' }, { path: 'abc' }] }],
    paramMap: convertToParamMap({ id: 'abc' }),
  } as unknown as ActivatedRouteSnapshot;

  const run = () =>
    TestBed.runInInjectionContext(() => recordByIdGuard(route, {} as RouterStateSnapshot)) as Promise<UrlTree>;

  it('pide el registro por su id y lleva a su detalle', async () => {
    api.get.and.resolveTo({ _id: 'abc', slug: 'lucia' });
    const tree = await run();
    expect(api.get).toHaveBeenCalledWith('/users/abc');
    expect(TestBed.inject(Router).serializeUrl(tree)).toBe('/users/lucia');
  });

  it('si no existe, avisa y lleva al listado', async () => {
    const failure = new Error('404');
    api.get.and.rejectWith(failure);
    const tree = await run();
    expect(errors.handle).toHaveBeenCalledWith(failure);
    expect(TestBed.inject(Router).serializeUrl(tree)).toBe('/users');
  });
});
