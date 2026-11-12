import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ThemeService } from '../../core/services/theme.service';
import { SiteHeaderComponent } from './site-header.component';

describe('SiteHeaderComponent', () => {
  function render(overlay = false) {
    TestBed.configureTestingModule({
      imports: [SiteHeaderComponent],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(SiteHeaderComponent);
    fixture.componentRef.setInput('overlay', overlay);
    fixture.detectChanges();
    return fixture;
  }

  it('lleva al inicio desde el logo y tiene Inicio y Experiencias', () => {
    const element: HTMLElement = render().nativeElement;
    const links = [...element.querySelectorAll('a')].map((link) => [link.textContent?.trim(), link.getAttribute('href')]);

    expect(links).toEqual([
      ['', '/'],
      ['Inicio', '/'],
      ['Experiencias', '/experiencias'],
    ]);
    expect(element.querySelector('a')?.getAttribute('aria-label')).toBe('Routly, ir al inicio');
  });

  it('el botón de tema dice a qué tema cambia y lo cambia', () => {
    const fixture = render();
    const theme = TestBed.inject(ThemeService);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    const before = theme.theme();

    expect(button.getAttribute('aria-label')).toBe(before === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    button.click();
    fixture.detectChanges();

    expect(theme.theme()).not.toBe(before);
    theme.toggle();
  });

  it('sobre la foto del Home va transparente', () => {
    expect(render(true).nativeElement.classList).toContain('is-overlay');
  });
});
