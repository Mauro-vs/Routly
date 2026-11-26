import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RatingSummaryComponent } from './rating-summary.component';

describe('RatingSummaryComponent', () => {
  function render(inputs: Record<string, unknown>): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
    const fixture = TestBed.createComponent(RatingSummaryComponent);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('la media, sus estrellas, cuántas y el enlace a sus opiniones filtradas', () => {
    const element = render({ rating: { average: 4.3, count: 14, distribution: {} }, targetId: 'e1', label: 'Como anfitrión' });
    expect(element.textContent).toContain('Como anfitrión');
    expect(element.querySelector('.average')?.textContent).toBe('4,3');
    expect(element.textContent).toContain('14 opiniones');
    expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('4,3 de 5 estrellas');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/reviews?sobre=e1');
  });

  it('sin opiniones lo dice y no enlaza', () => {
    const element = render({ rating: undefined, targetId: 'e1' });
    expect(element.textContent).toContain('Sin opiniones todavía');
    expect(element.querySelector('a')).toBeNull();
  });

  it('sin targetId (las rutas) no hay enlace', () => {
    const element = render({ rating: { average: 4, count: 3, distribution: {} } });
    expect(element.querySelector('a')).toBeNull();
  });
});
