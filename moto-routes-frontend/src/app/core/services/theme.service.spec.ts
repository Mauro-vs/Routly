import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;
  let initial: string | undefined;

  beforeEach(() => {
    initial = root.dataset['theme'];
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    localStorage.removeItem('routly.theme');
    if (initial) root.dataset['theme'] = initial;
    else delete root.dataset['theme'];
  });

  it('parte del tema que puso index.html', () => {
    root.dataset['theme'] = 'dark';
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
  });

  it('cambia el tema, lo pone en <html> y lo recuerda', () => {
    root.dataset['theme'] = 'light';
    const theme = TestBed.inject(ThemeService);

    theme.toggle();

    expect(theme.theme()).toBe('dark');
    expect(root.dataset['theme']).toBe('dark');
    expect(localStorage.getItem('routly.theme')).toBe('dark');
  });

  it('funciona aunque el almacenamiento esté bloqueado', () => {
    root.dataset['theme'] = 'light';
    spyOn(Storage.prototype, 'setItem').and.throwError('bloqueado');

    const theme = TestBed.inject(ThemeService);
    expect(() => theme.toggle()).not.toThrow();
    expect(theme.theme()).toBe('dark');
  });
});
