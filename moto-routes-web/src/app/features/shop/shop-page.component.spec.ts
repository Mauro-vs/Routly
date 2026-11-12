import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ShopPageComponent } from './shop-page.component';
import { experience, experienceRequests, flushFacets, page } from './testing/shop.fixtures';

describe('ShopPageComponent', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'experiencias', component: ShopPageComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function open(url: string): Promise<HTMLElement> {
    await harness.navigateByUrl(url);
    flushFacets(http);
    return harness.routeNativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('la primera vez, esqueletos y aviso de que está ocupado', async () => {
    const element = await open('/experiencias');
    harness.detectChanges();

    expect(element.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(element.querySelectorAll('ui-skeleton').length).toBeGreaterThan(0);
    experienceRequests(http)[0].flush(page([]));
    await settle();
  });

  it('pide lo que dice la URL y anuncia cuántas hay', async () => {
    const element = await open('/experiencias?categoria=montana-1');
    const [request] = experienceRequests(http);
    expect(request.request.params.get('category')).toBe('montana-1');
    request.flush(page(['a', 'b']));
    await settle();

    const status = element.querySelector('[role="status"]');
    expect(status?.textContent).toContain('2 experiencias');
  });

  it('cada tarjeta lleva a su detalle, con km, precio desde y próxima fecha', async () => {
    const element = await open('/experiencias');
    experienceRequests(http)[0].flush({
      data: [experience('costa-brava'), experience('sin-fechas', { priceFrom: null, nextDepartureAt: null })],
      pagination: { total: 2, page: 1, limit: 12, totalPages: 1 },
    });
    await settle();

    const cards = [...element.querySelectorAll('app-experience-card')];
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('a')?.getAttribute('href')).toBe('/experiencias/costa-brava');
    expect(cards[0].textContent).toContain('180');
    expect(cards[0].textContent).toContain('89');
    expect(cards[1].textContent).toContain('Sin fechas por ahora');
  });

  it('sin resultados, lo dice y deja quitar los filtros', async () => {
    const element = await open('/experiencias?buscar=nada');
    experienceRequests(http)[0].flush(page([]));
    await settle();
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    expect(element.textContent).toContain('No hay experiencias');
    const clear = [...element.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Quitar los filtros');
    clear?.click();

    expect(navigate).toHaveBeenCalled();
    expect(navigate.calls.mostRecent().args[1]?.queryParams?.['buscar']).toBeNull();
  });

  it('si falla, lo explica y reintentar vuelve a pedir', async () => {
    const element = await open('/experiencias');
    experienceRequests(http)[0].flush(null, { status: 0, statusText: 'Unknown Error' });
    await settle();

    expect(element.textContent).toContain('No hemos podido conectar');
    [...element.querySelectorAll('button')].find((button) => button.textContent?.includes('Reintentar'))?.click();
    experienceRequests(http)[0].flush(page(['a']));
    await settle();

    expect(element.querySelectorAll('app-experience-card').length).toBe(1);
  });

  it('con más de una página, la paginación', async () => {
    const element = await open('/experiencias');
    experienceRequests(http)[0].flush(page(['a'], { total: 30 }));
    await settle();

    expect(element.querySelector('ui-pager nav')).not.toBeNull();
  });

  it('cambiar la URL (atrás, un enlace) vuelve a pedir, sin recargar la página', async () => {
    await open('/experiencias?categoria=montana-1');
    experienceRequests(http)[0].flush(page(['a']));
    await settle();

    await harness.navigateByUrl('/experiencias?categoria=costa-2');
    const [request] = experienceRequests(http);
    expect(request.request.params.get('category')).toBe('costa-2');
    request.flush(page(['b']));
    await settle();
  });
});
