import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ThemeService } from '../../../core/services/theme.service';
import { IconComponent } from '../icon/icon.component';

/** Botón para pasar de tema claro a oscuro y al revés. */
@Component({
  selector: 'ui-theme-toggle',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="icon-btn" [attr.aria-label]="label()" [title]="label()" (click)="theme.toggle()">
      <ui-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" />
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly label = computed(() =>
    this.theme.theme() === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
  );
}
