import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'routly.theme';

/**
 * Tema claro u oscuro. El de la primera pintura lo pone un script de index.html: el del
 * sistema, o el último que se eligió aquí. Este servicio lo lee de ahí y lo cambia.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly root = document.documentElement;
  private readonly _theme = signal<Theme>(this.root.dataset['theme'] === 'dark' ? 'dark' : 'light');

  readonly theme = this._theme.asReadonly();

  toggle(): void {
    const theme: Theme = this._theme() === 'dark' ? 'light' : 'dark';
    this._theme.set(theme);
    this.root.dataset['theme'] = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Sin almacenamiento (modo privado...), el tema dura lo que dure la pestaña.
    }
  }
}
