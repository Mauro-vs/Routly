import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarouselComponent } from './carousel.component';

@Component({
  imports: [CarouselComponent],
  template: `
    <ui-carousel label="Tipos de carretera">
      @for (name of items; track name) {
        <a href="#" class="item" style="display:block;width:300px;flex:none">{{ name }}</a>
      }
    </ui-carousel>
  `,
})
class HostComponent {
  items = ['Montaña', 'Costa', 'Puertos', 'Viñedos', 'Desierto', 'Llanura'];
}

describe('CarouselComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let element: HTMLElement;
  let track: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(HostComponent);
    document.body.style.width = '600px';
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    element = fixture.nativeElement;
    track = element.querySelector('[role="list"]') as HTMLElement;
  });

  afterEach(() => {
    fixture.nativeElement.remove();
    document.body.style.width = '';
  });

  const button = (name: string): HTMLButtonElement =>
    element.querySelector(`button[aria-label="${name}"]`) as HTMLButtonElement;

  it('es una región con nombre, de tipo carrusel, con sus elementos en una lista', () => {
    const region = element.querySelector('[role="region"]');

    expect(region?.getAttribute('aria-label')).toBe('Tipos de carretera');
    expect(region?.getAttribute('aria-roledescription')).toBe('carrusel');
    expect(track.children.length).toBe(6);
    expect([...track.children].every((child) => child.getAttribute('role') === 'listitem')).toBeTrue();
  });

  it('al principio no se puede ir atrás, y sí adelante', () => {
    expect(button('Anteriores').disabled).toBeTrue();
    expect(button('Siguientes').disabled).toBeFalse();
    expect(button('Siguientes').getAttribute('aria-controls')).toBe(track.id);
  });

  it('el botón de siguientes avanza casi una pantalla', () => {
    const scrollBy = spyOn(track, 'scrollBy');
    button('Siguientes').click();

    const [options] = scrollBy.calls.mostRecent().args as unknown as [ScrollToOptions];
    expect(options.left).toBeGreaterThan(track.clientWidth * 0.8);
  });

  it('con las flechas del teclado, el foco pasa al elemento de al lado', () => {
    const links = [...element.querySelectorAll<HTMLAnchorElement>('a.item')];
    links[0].focus();

    links[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(links[1]);

    links[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(links[0]);
  });

  it('sin nada que desplazar, no hay botones', async () => {
    fixture.componentInstance.items = ['Montaña'];
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    fixture.detectChanges();

    expect(element.querySelector('button')).toBeNull();
  });
});
