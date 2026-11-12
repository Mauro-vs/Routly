import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ExperienceStore } from './experience.store';
import { DETAIL, flushDetail } from './testing/experience.fixtures';

describe('ExperienceStore', () => {
  let store: ExperienceStore;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(), ExperienceStore],
    });
    store = TestBed.inject(ExperienceStore);
    http = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => http.verify());

  it('pide la experiencia y sus salidas a la vez', async () => {
    const done = store.load(DETAIL.slug);
    expect(store.status()).toBe('loading');
    flushDetail(http);
    await done;

    expect(store.status()).toBe('ready');
    expect(store.experience()?.title).toBe('Calas de Mallorca en moto');
    expect(store.departures().map((d) => d.slug)).toEqual(['salida-llena', 'salida-libre']);
  });

  it('una experiencia que no existe (o no se ve) queda como no encontrada', async () => {
    const done = store.load('no-existe');
    http.expectOne('/api/shop/experiences/no-existe').flush(null, { status: 404, statusText: 'Not Found' });
    http.expectOne('/api/shop/experiences/no-existe/departures').flush(null, { status: 404, statusText: 'Not Found' });
    await done;

    expect(store.status()).toBe('notFound');
  });

  it('la salida elegida sale de la URL; una completa o una que no existe no quedan elegidas', async () => {
    const done = store.load(DETAIL.slug);
    flushDetail(http);
    await done;

    store.setSelectedSlug('salida-libre');
    expect(store.selected()?.slug).toBe('salida-libre');

    store.setSelectedSlug('salida-llena');
    expect(store.selected()).toBeNull();

    store.setSelectedSlug('otra');
    expect(store.selected()).toBeNull();
  });

  it('elegir una salida la escribe en la URL sin llenar el historial', () => {
    store.select('salida-libre');

    expect(navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({ queryParams: { salida: 'salida-libre' }, queryParamsHandling: 'merge', replaceUrl: true }),
    );
  });

  it('otra experiencia antes de que llegue la primera: la primera se cancela', async () => {
    void store.load('primera');
    const first = http.match((req) => req.url.startsWith('/api/shop/experiences/primera'));
    const done = store.load(DETAIL.slug);

    expect(first.every((request) => request.cancelled)).toBeTrue();
    flushDetail(http);
    await done;
    expect(store.experience()?.slug).toBe(DETAIL.slug);
  });
});
