import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { HomePageComponent } from './home-page.component';
import { flushHome } from './testing/home.fixtures';

describe('HomePageComponent', () => {
  let fixture: ComponentFixture<HomePageComponent>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HomePageComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  // Las promesas del store se resuelven en otra vuelta: se espera a ella antes de pintar
  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const hrefs = (selector: string): string[] =>
    [...element.querySelectorAll<HTMLAnchorElement>(selector)].map((link) => link.getAttribute('href') ?? '');

  it('mientras carga, avisa de que está ocupado', () => {
    expect(element.querySelector('[aria-busy="true"]')).not.toBeNull();
    flushHome(http);
  });

  it('el panel de orientación lleva cada tipo de carretera al Shop filtrado, con cuántas tiene', async () => {
    flushHome(http);
    await settle();

    const sign = element.querySelector('nav[aria-label="Tipos de carretera"]') as HTMLElement;
    expect(hrefs('nav[aria-label="Tipos de carretera"] a')).toEqual(['/experiencias?categoria=montana-1', '/experiencias?categoria=costa-2']);
    expect(sign.textContent).toContain('Montaña');
    expect(sign.textContent).toContain('6 experiencias');
  });

  it('el hito enseña el total de experiencias', async () => {
    flushHome(http);
    await settle();

    expect(element.querySelector('.milestone')?.textContent).toContain('12');
  });

  it('sin experiencias no hay hito (un poste con un 0 no dice nada)', async () => {
    flushHome(http, { total: 0 });
    await settle();

    expect(element.querySelector('.milestone')).toBeNull();
  });

  it('con cinco cifras o más, el hito las separa y encoge la cifra para que quepa', async () => {
    flushHome(http, { total: 12840 });
    await settle();

    const milestone = element.querySelector('.milestone') as HTMLElement;
    expect(milestone.textContent).toContain('12.840');
    expect(milestone.classList).toContain('is-wide');
  });

  it('la búsqueda del panel lleva al Shop con la búsqueda puesta', async () => {
    flushHome(http);
    await settle();
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const input = element.querySelector('input[type="search"]') as HTMLInputElement;

    input.value = '  costa ';
    element.querySelector('form')?.dispatchEvent(new Event('submit'));

    expect(navigate).toHaveBeenCalledWith(['/experiencias'], { queryParams: { buscar: 'costa' } });
  });

  it('cada carrusel lleva al Shop con su filtro: destinos, tipos de carretera y guías', async () => {
    flushHome(http);
    await settle();

    expect(hrefs('#destinos ui-carousel a')).toEqual(['/experiencias?ubicacion=jaca-1']);
    expect(hrefs('#carreteras ui-carousel a')).toEqual(['/experiencias?categoria=montana-1', '/experiencias?categoria=costa-2']);
    expect(hrefs('#guias ui-carousel a')).toEqual(['/experiencias?anfitrion=pablo-ortega-1']);
  });

  it('un carrusel sin elementos no se enseña', async () => {
    flushHome(http, { hosts: [] });
    await settle();

    expect(element.querySelector('#guias')).toBeNull();
    expect(element.querySelector('#destinos')).not.toBeNull();
  });

  it('si falla, lo explica y deja reintentar', async () => {
    http.expectOne((req) => req.url === '/api/shop/categories').flush(null, { status: 0, statusText: 'Unknown Error' });
    http.match(() => true).forEach((request) => request.flush({ data: [], pagination: { total: 0, page: 1, limit: 1, totalPages: 0 } }));
    await settle();

    expect(element.textContent).toContain('No hemos podido conectar');
    const retry = [...element.querySelectorAll('button')].find((button) => button.textContent?.includes('Reintentar'));
    retry?.click();
    flushHome(http);
    await settle();

    expect(hrefs('nav[aria-label="Tipos de carretera"] a').length).toBe(2);
  });
});
