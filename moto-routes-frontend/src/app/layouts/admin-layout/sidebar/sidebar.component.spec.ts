import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ApiStatusService } from '../../../core/services/api-status.service';
import { CollectionCountsService } from '../../../core/services/collection-counts.service';
import { SidebarComponent } from './sidebar.component';

const KEY = 'routly.nav.collapsed';

describe('SidebarComponent', () => {
  let stable: () => Promise<void>;

  async function render(): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ApiStatusService,
          useValue: { status: signal('online'), host: 'localhost:3000', docsUrl: '', check: () => Promise.resolve() },
        },
        { provide: CollectionCountsService, useValue: { load: () => Promise.resolve() } },
      ],
    });
    const fixture = TestBed.createComponent(SidebarComponent);
    stable = () => fixture.whenStable();
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  const groupButton = (element: HTMLElement, name: string): HTMLButtonElement =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button.nav__label')).find(
      (button) => button.textContent?.trim().startsWith(name),
    )!;

  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => localStorage.removeItem(KEY));

  it('un grupo se pliega: su lista deja de ser alcanzable y se recuerda', async () => {
    const element = await render();
    const button = groupButton(element, 'Catálogo');
    expect(button.getAttribute('aria-expanded')).toBe('true');

    button.click();
    await stable();

    expect(button.getAttribute('aria-expanded')).toBe('false');
    const list = element.querySelector<HTMLElement>(`#${button.getAttribute('aria-controls')}`)!;
    expect(list.inert).toBeTrue();
    expect(JSON.parse(localStorage.getItem(KEY) ?? '[]')).toEqual(['Catálogo']);
  });

  it('al entrar, los grupos plegados de la última visita siguen plegados', async () => {
    localStorage.setItem(KEY, JSON.stringify(['Comunidad']));
    const element = await render();

    expect(groupButton(element, 'Comunidad').getAttribute('aria-expanded')).toBe('false');
    expect(groupButton(element, 'Catálogo').getAttribute('aria-expanded')).toBe('true');
  });

  it('un valor guardado que no se entiende no rompe el menú', async () => {
    localStorage.setItem(KEY, '{no es json');
    const element = await render();
    expect(groupButton(element, 'Catálogo').getAttribute('aria-expanded')).toBe('true');
  });
});
