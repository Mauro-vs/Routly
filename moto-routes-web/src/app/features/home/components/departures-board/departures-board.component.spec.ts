import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ShopExperience } from '../../../../core/api/shop.models';
import { DeparturesBoardComponent } from './departures-board.component';

const experience = (slug: string, next: string | null, priceFrom: number | null): ShopExperience =>
  ({
    _id: slug,
    slug,
    title: `Salida ${slug}`,
    nextDepartureAt: next,
    priceFrom,
    route: { distance: 120, startLocation: { city: 'Palma' }, endLocation: { city: 'Sóller' } },
  }) as unknown as ShopExperience;

describe('DeparturesBoardComponent', () => {
  async function render(experiences: ShopExperience[]): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
    const fixture = TestBed.createComponent(DeparturesBoardComponent);
    fixture.componentRef.setInput('experiences', experiences);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('una fila por salida, con el día en grande, el recorrido y el precio, enlazada a su detalle', async () => {
    const element = await render([experience('calas', '2026-11-14T08:00:00.000Z', 70)]);
    const row = element.querySelector<HTMLAnchorElement>('a.row')!;

    expect(row.getAttribute('href')).toBe('/experiencias/calas');
    expect(row.querySelector('.date strong')?.textContent?.trim()).toBe('14');
    expect(row.querySelector('.trip')?.textContent).toContain('Sóller');
    expect(row.querySelector('.price')?.textContent).toContain('70');
  });

  it('las que no tienen fecha no salen en el tablón', async () => {
    const element = await render([experience('sin-fecha', null, null), experience('con-fecha', '2026-11-20T08:00:00.000Z', 80)]);
    expect(element.querySelectorAll('a.row').length).toBe(1);
  });

  it('"Ver todas" lleva al Shop con fechas y por la más próxima', async () => {
    const element = await render([]);
    expect(element.querySelector('a.all')?.getAttribute('href')).toBe('/experiencias?con-fechas=si&orden=proximas');
  });
});
