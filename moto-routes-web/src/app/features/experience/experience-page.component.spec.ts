import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ExperiencePageComponent } from './experience-page.component';
import { DETAIL, flushDetail } from './testing/experience.fixtures';

describe('ExperiencePageComponent', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'experiencias/:slug', component: ExperiencePageComponent }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function open(url: string, flush: (http: HttpTestingController) => void = flushDetail): Promise<HTMLElement> {
    await harness.navigateByUrl(url);
    flush(http);
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  const text = (element: Element | null | undefined): string => element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  it('pone el nombre de la experiencia en la pestaña', async () => {
    await open(`/experiencias/${DETAIL.slug}`);
    expect(TestBed.inject(Title).getTitle()).toBe('Calas de Mallorca en moto · Routly');
  });

  it('un título largo (cerca del máximo de 120) va más pequeño; uno normal, no', async () => {
    const normal = await open(`/experiencias/${DETAIL.slug}`);
    expect(normal.querySelector('h1')?.classList).not.toContain('is-long');

    const long = { ...DETAIL, slug: 'larga-1', title: 'Travesía completa de los Pirineos del Cantábrico al Mediterráneo por puertos de primera' };
    const element = await open('/experiencias/larga-1', (http) => flushDetail(http, { detail: long }));
    expect(element.querySelector('h1')?.classList).toContain('is-long');
  });

  it('enseña la ruta, el anfitrión con enlace a sus experiencias y lo práctico', async () => {
    const element = await open(`/experiencias/${DETAIL.slug}`);

    expect(text(element.querySelector('h1'))).toBe('Calas de Mallorca en moto');
    expect(text(element.querySelector('.route-sign'))).toContain('Palma');
    expect(text(element.querySelector('.route-sign'))).toContain('Sóller');
    expect(text(element.querySelector('.route-sign'))).toContain('120');
    expect(text(element)).toContain('Guía en Mallorca desde 2015.');
    expect(element.querySelector('a[href="/experiencias?anfitrion=lucia-ferrer-1"]')).not.toBeNull();
    expect(text(element)).toContain("Plaça d'Espanya, Palma");
    expect(text(element)).toContain('Español');
    expect(text(element)).toContain('De 2 a 6');
    expect(text(element)).toContain('BMW R 1250 GS');
  });

  it('las salidas son un grupo de opciones; la completa se ve, pero no se puede elegir', async () => {
    const element = await open(`/experiencias/${DETAIL.slug}`);
    const group = element.querySelector('[role="radiogroup"]');
    const radios = [...element.querySelectorAll<HTMLInputElement>('input[type="radio"]')];

    expect(group?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(radios.length).toBe(2);
    expect(radios[0].disabled).toBeTrue();
    expect(text(radios[0].closest('label'))).toContain('Completa');
    expect(radios[1].disabled).toBeFalse();
    expect(text(radios[1].closest('label'))).toContain('6 plazas libres');
  });

  it('elegir una salida la escribe en la URL', async () => {
    const element = await open(`/experiencias/${DETAIL.slug}`);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    element.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();

    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { salida: 'salida-libre' } }));
  });

  it('con la salida en la URL queda elegida, y Reservar explica por qué aún no se puede', async () => {
    const element = await open(`/experiencias/${DETAIL.slug}?salida=salida-libre`);
    const radios = element.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    const reserve = [...element.querySelectorAll('button')].find((button) => text(button).startsWith('Reservar')) as HTMLButtonElement;

    expect(radios[1].checked).toBeTrue();
    expect(reserve.disabled).toBeTrue();
    const reason = element.querySelector(`#${reserve.getAttribute('aria-describedby')}`);
    expect(text(reason)).toContain('Las reservas llegan');
  });

  it('sin salidas, lo dice', async () => {
    const element = await open(`/experiencias/${DETAIL.slug}`, (http) => flushDetail(http, { departures: [] }));
    expect(text(element)).toContain('Aún no hay salidas programadas');
    expect(element.querySelector('[role="radiogroup"]')).toBeNull();
  });

  it('una experiencia que no existe lo dice y lleva al Shop', async () => {
    const element = await open('/experiencias/no-existe', (http) => {
      http.expectOne('/api/shop/experiences/no-existe').flush(null, { status: 404, statusText: 'Not Found' });
      http.expectOne('/api/shop/experiences/no-existe/departures').flush(null, { status: 404, statusText: 'Not Found' });
    });

    expect(text(element)).toContain('No hemos encontrado esta experiencia');
    expect(element.querySelector('a[href="/experiencias"]')).not.toBeNull();
  });
});
