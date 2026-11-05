import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Departure } from '../../../../core/models/departure.model';
import { Route } from '../../../../core/models/route.model';
import { DashboardAgendaComponent } from './dashboard-agenda.component';

const NOW = new Date('2026-11-04T10:00:00.000Z');

const DEPARTURE = {
  _id: 'd1',
  slug: 'tramuntana',
  experience: { _id: 'e1', title: 'Tramuntana al amanecer', slug: 'tramuntana' },
  startAt: '2026-11-12T07:00:00.000Z',
  capacity: 8,
  price: 89,
} as Departure;

const ROUTE = {
  _id: 'r1',
  slug: 'ruta-del-vino',
  title: 'Ruta del Vino',
  difficulty: 'easy',
  distance: 90,
  duration: 2,
  isActive: false,
  startLocation: null,
  endLocation: null,
} as Route;

describe('DashboardAgendaComponent', () => {
  let fixture: ComponentFixture<DashboardAgendaComponent>;

  async function render(departures: Departure[], routes: Route[]): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
    fixture = TestBed.createComponent(DashboardAgendaComponent);
    fixture.componentRef.setInput('departures', departures);
    fixture.componentRef.setInput('routes', routes);
    fixture.componentRef.setInput('loadedAt', NOW);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('pone delante los días de cada salida y, en las rutas, sus kilómetros', async () => {
    const element = await render([DEPARTURE], [ROUTE]);

    const [agenda, recent] = Array.from(element.querySelectorAll('.road'));
    expect(agenda.querySelector('.road__mark b')?.textContent?.trim()).toBe('+8 d');
    expect(agenda.textContent).toContain('8 plazas');
    expect(recent.querySelector('.road__mark b')?.textContent?.trim()).toBe('90');
  });

  it('una ruta inactiva se ve apagada', async () => {
    const element = await render([DEPARTURE], [ROUTE]);
    expect(element.querySelectorAll('.road')[1].querySelector('li')?.classList).toContain('is-off');
  });

  it('sin salidas próximas lo dice en lugar de la lista', async () => {
    const element = await render([], [ROUTE]);
    expect(element.textContent).toContain('No hay salidas programadas a partir de hoy.');
    expect(element.querySelectorAll('.road').length).toBe(1);
  });
});
