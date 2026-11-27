import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
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
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../auth/auth.service';
import { returnUrlParams, safeReturnUrl } from '../../../../auth/return-url';
import { USER_LIMITS } from '../../../../core/models/user.model';
import { toApiError } from '../../../../core/utils/api-error.mapper';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { PasswordRevealComponent } from '../../../../shared/components/form-field/password-reveal/password-reveal.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { applyServerErrors, controlErrorMessage } from '../../../../shared/utils/form-errors';
import { email, letterAndNumber, minTrimmed, notBlank } from '../../../../shared/utils/validators';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('password')?.value === group.get('repeat')?.value ? null : { mismatch: true };
}

// Los mismos criterios que src/schemas/user.schema.js en la API.
function createRegisterForm() {
  return new FormGroup(
    {
      name: new FormControl('', {
        nonNullable: true,
        validators: [notBlank, minTrimmed(2), Validators.maxLength(USER_LIMITS.name)],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [notBlank, email, Validators.maxLength(USER_LIMITS.email)],
      }),
      password: new FormControl('', {
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

type RegisterControl = keyof ReturnType<typeof createRegisterForm>['controls'];

/**
 * Crear una cuenta (`/register`). La API devuelve ya la sesión, así que se entra directamente.
 * Las reglas de la contraseña se ven mientras se escribe, no después de equivocarse.
 */
@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthShellComponent,
    FormFieldComponent,
    IconComponent,
    InputDirective,
    PasswordRevealComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  /** Adónde ir después. Llega como `?returnUrl=` y se valida antes de usarlo. */
  readonly returnUrl = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly form = createRegisterForm();
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly submitted = signal(false);
  // Los formularios reactivos no son signals: este pulso avisa de cada cambio.
  private readonly changes = toSignal(this.form.events);

  protected readonly rules = computed(() => {
    this.changes();
    const password = this.form.controls.password.value;
    return [
      {
        label: `Entre ${USER_LIMITS.passwordMin} y ${USER_LIMITS.passwordMax} caracteres`,
        met: password.length >= USER_LIMITS.passwordMin && password.length <= USER_LIMITS.passwordMax,
      },
      { label: 'Al menos una letra y un número', met: /\p{L}/u.test(password) && /\d/.test(password) },
    ];
  });

  protected readonly repeatError = computed(() => {
    this.changes();
    const control = this.form.controls.repeat;
    if (!control.touched && !this.submitted()) return null;
    if (control.errors) return controlErrorMessage(control);
    return this.form.hasError('mismatch') ? 'Las contraseñas no coinciden.' : null;
  });

  protected loginParams() {
    return returnUrlParams(safeReturnUrl(this.returnUrl()));
  }

  protected errorOf(name: RegisterControl): string | null {
    this.changes();
    const control = this.form.controls[name];
    return control.touched || this.submitted() ? controlErrorMessage(control) : null;
  }

  protected async submit(): Promise<void> {
    if (this.submitting()) return;

    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    this.submitting.set(true);
    try {
      await this.auth.register({ name: name.trim(), email: email.trim(), password });
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (error) {
      this.showError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  private showError(error: unknown): void {
    const apiError = toApiError(error);
    if (apiError.isConflict) {
      applyServerErrors(this.form, { email: apiError.message });
      this.focusFirstInvalid();
    } else if (apiError.fieldErrors) {
      const unmatched = Object.values(applyServerErrors(this.form, apiError.fieldErrors));
      if (unmatched.length > 0) this.error.set(unmatched.join(' '));
      this.focusFirstInvalid();
    } else {
      this.error.set(apiError.message);
    }
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid')?.focus(),
      { injector: this.injector },
    );
  }
}
