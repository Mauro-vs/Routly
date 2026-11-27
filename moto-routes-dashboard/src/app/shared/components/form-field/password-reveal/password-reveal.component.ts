import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  contentChild,
  signal,
} from '@angular/core';

import { IconComponent } from '../../icon/icon.component';

/**
 * Campo de contraseña con el botón de verla mientras se escribe. El `input` se proyecta dentro,
 * con `#field`, y sigue enlazado a su `ui-form-field`.
 *
 *   <ui-form-field label="Contraseña">
 *     <ui-password-reveal><input #field uiInput type="password" formControlName="password" /></ui-password-reveal>
 *   </ui-form-field>
 */
@Component({
  selector: 'ui-password-reveal',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './password-reveal.component.html',
  styleUrl: './password-reveal.component.css',
})
export class PasswordRevealComponent {
  private readonly field = contentChild.required<ElementRef<HTMLInputElement>>('field');

  protected readonly visible = signal(false);
  protected readonly label = computed(() =>
    this.visible() ? 'Ocultar la contraseña' : 'Mostrar la contraseña',
  );

  protected toggle(): void {
    this.visible.update((visible) => !visible);
    this.field().nativeElement.type = this.visible() ? 'text' : 'password';
  }
}
