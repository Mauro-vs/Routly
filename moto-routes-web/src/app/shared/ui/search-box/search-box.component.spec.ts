import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SEARCH_DEBOUNCE_MS, SearchBoxComponent } from './search-box.component';

describe('SearchBoxComponent', () => {
  let fixture: ComponentFixture<SearchBoxComponent>;
  let emitted: string[];
  let input: HTMLInputElement;

  beforeEach(() => {
    jasmine.clock().install();
    TestBed.configureTestingModule({ imports: [SearchBoxComponent], providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(SearchBoxComponent);
    fixture.componentRef.setInput('label', 'Buscar experiencias');
    fixture.componentRef.setInput('hint', 'Palabras enteras: costa, pirineo');
    fixture.detectChanges();
    emitted = [];
    fixture.componentInstance.search.subscribe((value) => emitted.push(value));
    input = fixture.nativeElement.querySelector('input');
  });

  afterEach(() => jasmine.clock().uninstall());

  function type(value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('tiene su etiqueta y su pista unidas al campo', () => {
    const label: HTMLLabelElement = fixture.nativeElement.querySelector('label');
    const hint = fixture.nativeElement.querySelector(`#${input.getAttribute('aria-describedby')}`);

    expect(label.htmlFor).toBe(input.id);
    expect(label.textContent).toContain('Buscar experiencias');
    expect(hint.textContent).toContain('Palabras enteras');
    expect(input.type).toBe('search');
  });

  it('espera a que se deje de escribir y emite una sola vez, sin espacios de más', () => {
    type('cos');
    jasmine.clock().tick(SEARCH_DEBOUNCE_MS - 1);
    type(' costa ');
    jasmine.clock().tick(SEARCH_DEBOUNCE_MS - 1);
    expect(emitted).toEqual([]);

    jasmine.clock().tick(1);
    expect(emitted).toEqual(['costa']);
  });

  it('con Enter busca ya, sin esperar', () => {
    type('pirineo');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    jasmine.clock().tick(SEARCH_DEBOUNCE_MS);

    expect(emitted).toEqual(['pirineo']);
  });

  it('el botón de borrar solo sale con texto, vacía el campo, emite y devuelve el foco', () => {
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    type('costa');
    jasmine.clock().tick(SEARCH_DEBOUNCE_MS);
    const clear: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(clear.getAttribute('aria-label')).toBe('Borrar la búsqueda');

    clear.click();
    fixture.detectChanges();
    jasmine.clock().tick(SEARCH_DEBOUNCE_MS);

    expect(input.value).toBe('');
    expect(emitted).toEqual(['costa', '']);
    expect(document.activeElement).toBe(input);
  });

  it('enseña el valor que llega de fuera (la URL) y no lo vuelve a emitir', () => {
    fixture.componentRef.setInput('value', 'viñedos');
    fixture.detectChanges();
    expect(input.value).toBe('viñedos');

    type('viñedos');
    jasmine.clock().tick(SEARCH_DEBOUNCE_MS);
    expect(emitted).toEqual([]);
  });
});
