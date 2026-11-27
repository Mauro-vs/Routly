import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStore } from '../../auth/auth.store';
import { BrandMarkComponent } from '../../shared/components/brand-mark/brand-mark.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';

/** Armazón de la zona de cada usuario, sin el panel: su perfil y su garaje. */
@Component({
  selector: 'app-account-layout',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    BrandMarkComponent,
    UserMenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-layout.component.html',
  styleUrl: './account-layout.component.css',
})
export class AccountLayoutComponent {
  protected readonly store = inject(AuthStore);
}
