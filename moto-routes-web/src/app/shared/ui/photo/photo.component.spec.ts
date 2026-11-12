import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PhotoComponent } from './photo.component';

describe('PhotoComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PhotoComponent], providers: [provideZonelessChangeDetection()] });
  });

  function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(PhotoComponent);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return fixture;
  }

  it('con url, una imagen con su alt, su tamaño y carga diferida', () => {
    const img: HTMLImageElement = render({ src: 'https://example.com/a.jpg', alt: 'Costa Brava' }).nativeElement.querySelector('img');

    expect(img.getAttribute('src')).toBe('https://example.com/a.jpg');
    expect(img.alt).toBe('Costa Brava');
    expect(img.getAttribute('width')).toBe('1200');
    expect(img.getAttribute('height')).toBe('800');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('mientras la foto no llega se ve el paisaje, y al cargar aparece encima', () => {
    const fixture = render({ src: 'https://example.com/lenta.jpg', seed: 'costa' });
    const img: HTMLImageElement = fixture.nativeElement.querySelector('img');

    expect(fixture.nativeElement.querySelector('svg')).not.toBeNull();
    expect(img.classList).not.toContain('is-loaded');

    img.dispatchEvent(new Event('load'));
    fixture.detectChanges();
    expect(img.classList).toContain('is-loaded');
  });

  it('con prioridad, la primera imagen se pide enseguida', () => {
    const img: HTMLImageElement = render({ src: 'https://example.com/a.jpg', priority: true }).nativeElement.querySelector('img');

    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });

  it('sin url, el paisaje de la marca, sin imagen rota', () => {
    const element: HTMLElement = render({ src: null, seed: 'costa' }).nativeElement;

    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('svg')).not.toBeNull();
  });

  it('si la imagen no carga, pasa al paisaje', () => {
    const fixture = render({ src: 'https://example.com/rota.jpg' });
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('svg')).not.toBeNull();
  });

  it('el mismo seed da siempre el mismo paisaje, y otro seed, otro', () => {
    // Los trazados (el id del degradado es único por instancia y no cuenta)
    const draw = (seed: string): string =>
      [...render({ src: null, seed }).nativeElement.querySelectorAll('svg path')].map((path) => path.getAttribute('d')).join('|');

    expect(draw('pirineo')).toBe(draw('pirineo'));
    expect(draw('pirineo')).not.toBe(draw('costa'));
  });
});
