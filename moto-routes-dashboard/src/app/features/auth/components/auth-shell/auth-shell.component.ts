import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BrandMarkComponent } from '../../../../shared/components/brand-mark/brand-mark.component';
import { ThemeToggleComponent } from '../../../../shared/components/theme-toggle/theme-toggle.component';

/**
 * Marco del inicio de sesión y del registro: a un lado la marca, con la carretera del logo
 * dibujándose al entrar, y al otro el formulario, que se proyecta dentro. Es el único sitio
 * del panel donde la expresión va por delante, y solo se ve una vez por sesión.
 */
@Component({
  selector: 'app-auth-shell',
  imports: [BrandMarkComponent, ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.css',
})
export class AuthShellComponent {
  /** De la esquina inferior a la superior: una curva enlazada, como un tramo de puerto. */
  protected readonly roadPath =
    'M 780 1010 C 590 930 330 860 370 680 C 410 510 690 540 650 350 C 625 220 430 190 400 -60';
}
