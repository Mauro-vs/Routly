import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PagerComponent, pageItems } from './pager.component';

describe('pageItems', () => {
  it('con pocas páginas, todas', () => {
    expect(pageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('con muchas, la primera, la última, las vecinas y un hueco donde se salta', () => {
    expect(pageItems(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
    expect(pageItems(1, 20)).toEqual([1, 2, null, 20]);
    expect(pageItems(19, 20)).toEqual([1, null, 18, 19, 20]);
  });
});

describe('PagerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PagerComponent],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  function render(page: number, totalPages: number): HTMLElement {
    const fixture = TestBed.createComponent(PagerComponent);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('totalPages', totalPages);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('con una sola página no se enseña', () => {
    expect(render(1, 1).querySelector('nav')).toBeNull();
  });

  it('cada página es un enlace con su parámetro en la URL; la primera, sin parámetro', () => {
    const element = render(2, 3);
    const hrefs = [...element.querySelectorAll('a')].map((link) => [link.getAttribute('aria-label') ?? link.textContent?.trim(), link.getAttribute('href')]);

    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Páginas');
    expect(hrefs).toEqual([
      ['Página anterior', '/'],
      ['1', '/'],
      ['3', '/?pagina=3'],
      ['Página siguiente', '/?pagina=3'],
    ]);
  });

  it('la actual no es un enlace y se anuncia como actual', () => {
    const current = render(2, 3).querySelector('[aria-current="page"]');

    expect(current?.tagName).toBe('SPAN');
    expect(current?.textContent?.trim()).toBe('2');
  });

  it('en la primera no hay anterior, y en la última no hay siguiente', () => {
    expect(render(1, 3).querySelector('[aria-label="Página anterior"]')?.tagName).toBe('SPAN');
    expect(render(3, 3).querySelector('[aria-label="Página siguiente"]')?.tagName).toBe('SPAN');
  });
});
