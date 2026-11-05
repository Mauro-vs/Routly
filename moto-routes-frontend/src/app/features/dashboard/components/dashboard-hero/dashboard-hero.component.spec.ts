import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Departure } from '../../../../core/models/departure.model';
import { DashboardHeroComponent } from './dashboard-hero.component';

const NOW = new Date('2026-11-04T10:00:00.000Z');

const DEPARTURE = {
  _id: 'd1',
  slug: 'tramuntana',
  experience: { _id: 'e1', title: 'Tramuntana al amanecer', slug: 'tramuntana' },
  startAt: '2026-11-12T07:00:00.000Z',
  capacity: 1,
  price: 89,
} as Departure;

describe('DashboardHeroComponent', () => {
  let fixture: ComponentFixture<DashboardHeroComponent>;

  async function render(departure: Departure | null): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
    fixture = TestBed.createComponent(DashboardHeroComponent);
    fixture.componentRef.setInput('departure', departure);
    fixture.componentRef.setInput('loadedAt', NOW);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('cuenta los días que faltan y enlaza la salida', async () => {
    const element = await render(DEPARTURE);

    expect(element.querySelector('.hero__number')?.textContent?.trim()).toBe('8');
    expect(element.textContent).toContain('días para la próxima salida');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/departures/tramuntana');
    expect(element.textContent).toContain('1 plaza');
  });

  it('sin salidas programadas lo dice', async () => {
    const element = await render(null);

    expect(element.querySelector('h2')?.textContent).toContain('No hay salidas programadas');
    expect(element.querySelector('.hero__number')).toBeNull();
  });
});
