import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SiteFooterComponent } from './site-footer.component';

describe('SiteFooterComponent', () => {
  it('dice qué es Routly, enlaza las páginas y no inventa nada', () => {
    TestBed.configureTestingModule({
      imports: [SiteFooterComponent],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(SiteFooterComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Salidas guiadas en moto');
    expect(element.textContent).toContain('Proyecto de DAW');
    expect([...element.querySelectorAll('nav a')].map((link) => link.getAttribute('href'))).toEqual(['/', '/experiencias']);
  });
});
