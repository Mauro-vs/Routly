import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AppComponent } from './app.component';

@Component({ template: '<p>página</p>' })
class PageStubComponent {}

describe('AppComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: '', component: PageStubComponent },
          { path: 'experiencias', component: PageStubComponent },
        ]),
      ],
    });
  });

  async function headerAt(url: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(AppComponent);
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('app-site-header');
  }

  it('en el Home la cabecera va sobre la foto, transparente', async () => {
    expect((await headerAt('/?x=1')).classList).toContain('is-overlay');
  });

  it('en el resto de páginas, sobre la banda', async () => {
    expect((await headerAt('/experiencias')).classList).not.toContain('is-overlay');
  });

  it('el primer Tab lleva a saltar al contenido', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const skip = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(skip.textContent).toContain('Saltar al contenido');
    expect(skip.getAttribute('href')).toBe('#contenido');
    expect(fixture.nativeElement.querySelector('main#contenido')).not.toBeNull();
  });
});
