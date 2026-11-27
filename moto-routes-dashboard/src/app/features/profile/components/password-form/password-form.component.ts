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
import { PasswordRevealComponent } from '../../../../shared/components/form-field/password-reveal/password-reveal.component';
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
  templateUrl: './password-form.component.html',
  styleUrl: './password-form.component.css',
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
