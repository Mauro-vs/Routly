import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { USER_LIMITS } from '../../../../core/models/user.model';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { PasswordRevealComponent } from '../../../../shared/components/form-field/password-reveal.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { applyServerErrors, controlErrorMessage } from '../../../../shared/utils/form-errors';
import { letterAndNumber } from '../../../../shared/utils/validators';
import { ProfileService } from '../../services/profile.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('newPassword')?.value === group.get('repeat')?.value ? null : { mismatch: true };
}

function createPasswordForm() {
  return new FormGroup(
    {
      currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(USER_LIMITS.passwordMin),
          Validators.maxLength(USER_LIMITS.passwordMax),
          letterAndNumber,
        ],
      }),
      repeat: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: passwordsMatch },
  );
}

/**
 * El cambio de contraseña de Mi perfil. Va aparte de "Tus datos" porque la API cierra las
 * demás sesiones y devuelve una nueva para esta (ProfileService la guarda).
 */
@Component({
  selector: 'app-password-form',
  imports: [ReactiveFormsModule, FormFieldComponent, IconComponent, InputDirective, PasswordRevealComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="card panel form-grid" [formGroup]="form" (ngSubmit)="changePassword()" novalidate>
      <h2>Contraseña</h2>
      @if (formError(); as message) {
        <p class="form-error" role="alert"><ui-icon name="warning-circle" />{{ message }}</p>
      }
      <ui-form-field label="Contraseña actual" [error]="errorOf('currentPassword')">
        <ui-password-reveal>
          <input #field uiInput type="password" name="currentPassword" formControlName="currentPassword" autocomplete="current-password" />
        </ui-password-reveal>
      </ui-form-field>
      <ui-form-field
        label="Contraseña nueva"
        [hint]="'Entre ' + limits.passwordMin + ' y ' + limits.passwordMax + ' caracteres, con una letra y un número.'"
        [error]="errorOf('newPassword')"
      >
        <ui-password-reveal>
          <input #field uiInput type="password" name="newPassword" formControlName="newPassword" autocomplete="new-password" />
        </ui-password-reveal>
      </ui-form-field>
      <ui-form-field label="Repite la contraseña nueva" [error]="repeatError()">
        <ui-password-reveal>
          <input #field uiInput type="password" name="repeat" formControlName="repeat" autocomplete="new-password" />
        </ui-password-reveal>
      </ui-form-field>
      <button type="submit" class="btn btn--secondary" [disabled]="changing()">
        {{ changing() ? 'Cambiando…' : 'Cambiar la contraseña' }}
      </button>
      <p class="note">Se cerrará la sesión en tus otros dispositivos.</p>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }

    .form-grid h2 {
      font-size: var(--text-base);
      font-weight: 750;
    }

    .note {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
  `,
})
export class PasswordFormComponent {
  private readonly profile = inject(ProfileService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly notifications = inject(NotificationService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly limits = USER_LIMITS;
  protected readonly form = createPasswordForm();
  protected readonly changing = signal(false);
  protected readonly formError = signal<string | null>(null);
  private readonly submitted = signal(false);

  // Los formularios reactivos no son signals: este pulso avisa de cada cambio.
  private readonly changes = toSignal(this.form.events);

  protected readonly repeatError = computed(() => {
    this.changes();
    const control = this.form.controls.repeat;
    if (!control.touched && !this.submitted()) return null;
    if (control.errors) return controlErrorMessage(control);
    return this.form.hasError('mismatch') ? 'Las contraseñas no coinciden.' : null;
  });

  /** Hay una contraseña a medio escribir. */
  hasUnsavedChanges(): boolean {
    return this.form.dirty;
  }

  protected errorOf(name: 'currentPassword' | 'newPassword'): string | null {
    this.changes();
    const control = this.form.controls[name];
    return control.touched || this.submitted() ? controlErrorMessage(control) : null;
  }

  protected async changePassword(): Promise<void> {
    if (this.changing()) return;

    this.submitted.set(true);
    this.formError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }

    const { currentPassword, newPassword } = this.form.getRawValue();
    this.changing.set(true);
    try {
      await this.profile.changePassword({ currentPassword, newPassword });
      this.form.reset();
      this.submitted.set(false);
      void this.notifications.success('Contraseña cambiada.');
    } catch (error) {
      const apiError = this.errors.handle(error, { inline: true });
      if (apiError.fieldErrors) {
        const unmatched = Object.values(applyServerErrors(this.form, apiError.fieldErrors));
        if (unmatched.length > 0) this.formError.set(unmatched.join(' '));
        this.focusFirstInvalid();
      } else if (apiError.type === 'validation' || apiError.isConflict) {
        this.formError.set(apiError.message);
      }
    } finally {
      this.changing.set(false);
    }
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid, select.ng-invalid')
          ?.focus(),
      { injector: this.injector },
    );
  }
}
