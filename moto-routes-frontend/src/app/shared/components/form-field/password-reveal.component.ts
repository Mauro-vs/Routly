import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  contentChild,
  signal,
} from '@angular/core';

import { IconComponent } from '../icon/icon.component';

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
  template: `
    <ng-content />
    <button
      type="button"
      class="icon-btn"
      [attr.aria-label]="label()"
      [attr.aria-pressed]="visible()"
      [title]="label()"
      (click)="toggle()"
    >
      <ui-icon [name]="visible() ? 'eye-slash' : 'eye'" />
    </button>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }

    :host ::ng-deep input {
      padding-right: 44px;
    }

    button {
      position: absolute;
      top: 50%;
      right: 2px;
      transform: translateY(-50%);
    }

    button:active {
      transform: translateY(-50%) scale(0.94);
    }
  `,
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
