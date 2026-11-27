import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthStore } from '../../core/auth/auth.store';
import { ThemeService } from '../../core/services/theme.service';
import { BrandMarkComponent } from '../../shared/ui/brand-mark/brand-mark.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';

/**
 * La cabecera: logo, Inicio, Experiencias, la cuenta (Entrar o el nombre del cliente) y el cambio
 * de tema, sobre la banda. En el Home va
 * transparente sobre la foto (`overlay`), y el panel de orientación hace de navegación.
 */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, BrandMarkComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.css',
  host: { '[class.is-overlay]': 'overlay()' },
})
export class SiteHeaderComponent {
  /** Transparente, sobre la foto del Home */
  readonly overlay = input(false);

  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthStore);
  protected readonly themeLabel = computed(() =>
    this.theme.theme() === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
  );
}
