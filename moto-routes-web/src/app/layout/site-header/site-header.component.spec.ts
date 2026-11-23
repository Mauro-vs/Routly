import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthStore } from '../../core/auth/auth.store';
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
      ['Entrar', '/entrar'],
    ]);
    expect(element.querySelector('a')?.getAttribute('aria-label')).toBe('Routly, ir al inicio');
  });

  it('con sesión, el enlace de la cuenta lleva a Mi cuenta con el nombre del cliente', () => {
    const fixture = render();
    TestBed.inject(AuthStore).setUser({ id: 'u1', name: 'Lucía Pérez', email: 'l@routly.dev', role: 'rider' });
    fixture.detectChanges();

    const account: HTMLAnchorElement = fixture.nativeElement.querySelector('a.account');
    expect(account.getAttribute('href')).toBe('/mi-cuenta');
    expect(account.textContent?.trim()).toBe('Lucía');
    expect(account.getAttribute('aria-label')).toBe('Mi cuenta');
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
