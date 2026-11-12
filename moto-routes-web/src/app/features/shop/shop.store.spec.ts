import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, convertToParamMap, provideRouter } from '@angular/router';

import { ShopStore } from './shop.store';
import { experienceRequests, flushFacets, page } from './testing/shop.fixtures';

describe('ShopStore', () => {
  let store: ShopStore;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(), ShopStore],
    });
    store = TestBed.inject(ShopStore);
    http = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    store.loadFacets();
    flushFacets(http);
  });

  afterEach(() => http.verify());

  const sync = (params: Record<string, string>) => store.sync(convertToParamMap(params));
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  it('la URL manda: pide a la API lo que dice la URL', async () => {
    sync({ categoria: 'montana-1', pagina: '2' });

    const [request] = experienceRequests(http);
    expect(request.request.params.get('category')).toBe('montana-1');
    expect(request.request.params.get('page')).toBe('2');
    request.flush(page(['a', 'b'], { total: 14, page: 2 }));
    await settle();

    expect(store.status()).toBe('ready');
    expect(store.experiences().map((e) => e.slug)).toEqual(['a', 'b']);
    expect(store.total()).toBe(14);
    expect(store.totalPages()).toBe(2);
  });

  it('al cambiar la URL antes de que llegue la respuesta, aborta la anterior y solo pinta la última', async () => {
    sync({ buscar: 'cos' });
    const [first] = experienceRequests(http);
    sync({ buscar: 'costa' });

    expect(first.cancelled).toBeTrue();
    const [second] = experienceRequests(http);
    second.flush(page(['costa-brava']));
    await settle();

    expect(store.status()).toBe('ready');
    expect(store.error()).toBeNull();
    expect(store.experiences().map((e) => e.slug)).toEqual(['costa-brava']);
  });

  it('mientras llega lo nuevo, lo anterior sigue a la vista', async () => {
    sync({});
    experienceRequests(http)[0].flush(page(['a']));
    await settle();

    sync({ pagina: '2' });
    expect(store.status()).toBe('loading');
    expect(store.experiences().map((e) => e.slug)).toEqual(['a']);
    experienceRequests(http)[0].flush(page(['b'], { total: 13, page: 2 }));
    await settle();
  });

  it('si falla, guarda el motivo, conserva lo anterior y reintentar repite la misma petición', async () => {
    sync({ categoria: 'costa-2' });
    experienceRequests(http)[0].flush(null, { status: 500, statusText: 'Error' });
    await settle();

    expect(store.status()).toBe('error');
    expect(store.error()).toContain('Algo ha fallado');

    store.retry();
    const [retried] = experienceRequests(http);
    expect(retried.request.params.get('category')).toBe('costa-2');
    retried.flush(page(['x']));
    await settle();
    expect(store.status()).toBe('ready');
  });

  it('una página que ya no existe pasa a la última, sin dejar rastro en el historial', async () => {
    sync({ pagina: '9' });
    experienceRequests(http)[0].flush(page([], { total: 14, page: 9 }));
    await settle();

    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { pagina: 2 }, queryParamsHandling: 'merge', replaceUrl: true }));
  });

  it('cambiar un filtro escribe la URL y vuelve a la primera página', () => {
    store.setFilter('category', 'costa-2');
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { categoria: 'costa-2', pagina: null }, queryParamsHandling: 'merge' }));

    store.setSearch('');
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { buscar: null, pagina: null } }));
  });

  it('quitar los filtros los quita todos, la búsqueda también, y deja el orden', () => {
    store.clearFilters();
    expect(navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: { categoria: null, anfitrion: null, ubicacion: null, buscar: null, dificultad: null, 'con-fechas': null, pagina: null },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('los filtros puestos, con su nombre; un slug que no existe sale como no encontrado', async () => {
    sync({ categoria: 'montana-1', anfitrion: 'no-existe-9', buscar: 'costa', dificultad: 'dificil', 'con-fechas': 'si' });
    experienceRequests(http)[0].flush(page([]));
    await settle();

    expect(store.activeFilters()).toEqual([
      { key: 'categoria', label: 'Montaña' },
      { key: 'anfitrion', label: 'Anfitrión no encontrado' },
      { key: 'buscar', label: '«costa»' },
      { key: 'dificultad', label: 'Difícil' },
      { key: 'con-fechas', label: 'Con fechas' },
    ]);
  });

  it('al destruirse, cancela lo pendiente', () => {
    sync({});
    const [request] = experienceRequests(http);
    TestBed.resetTestingModule();
    expect(request.cancelled).toBeTrue();
  });
});
