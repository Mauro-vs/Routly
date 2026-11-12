import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';

import { DEFAULT_DESCRIPTION, PageMetaStrategy } from './page-meta.strategy';

@Component({ template: '' })
class StubComponent {}

describe('PageMetaStrategy', () => {
  let router: Router;
  let title: Title;
  let meta: Meta;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'experiencias', title: 'Experiencias', data: { description: 'Todas las salidas' }, component: StubComponent },
          { path: 'experiencias/:slug', component: StubComponent },
        ]),
        { provide: TitleStrategy, useExisting: PageMetaStrategy },
      ],
    });
    router = TestBed.inject(Router);
    title = TestBed.inject(Title);
    meta = TestBed.inject(Meta);
  });

  it('pone el título y la descripción de la ruta', async () => {
    await router.navigateByUrl('/experiencias');

    expect(title.getTitle()).toBe('Experiencias · Routly');
    expect(meta.getTag('name="description"')?.content).toBe('Todas las salidas');
  });

  it('una página que los pone ella misma (el detalle) no se pisa al cambiar la URL', async () => {
    await router.navigateByUrl('/experiencias/costa-1');
    TestBed.inject(PageMetaStrategy).set('Costa en moto', 'Calas y acantilados');

    await router.navigateByUrl('/experiencias/costa-1?salida=dia-1');

    expect(title.getTitle()).toBe('Costa en moto · Routly');
    expect(meta.getTag('name="description"')?.content).toBe('Calas y acantilados');
  });

  it('sin nada, el nombre del sitio y la descripción general', () => {
    TestBed.inject(PageMetaStrategy).set(null);

    expect(title.getTitle()).toBe('Routly · salidas guiadas en moto');
    expect(meta.getTag('name="description"')?.content).toBe(DEFAULT_DESCRIPTION);
  });
});
