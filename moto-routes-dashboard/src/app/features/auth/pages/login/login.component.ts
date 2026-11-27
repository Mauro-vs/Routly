import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../auth/auth.service';
import { returnUrlParams, safeReturnUrl } from '../../../../auth/return-url';
import { toApiError } from '../../../../core/utils/api-error.mapper';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { PasswordRevealComponent } from '../../../../shared/components/form-field/password-reveal/password-reveal.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { controlErrorMessage } from '../../../../shared/utils/form-errors';
import { email, notBlank } from '../../../../shared/utils/validators';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';

function createLoginForm() {
  return new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [notBlank, email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
}

type LoginControl = keyof ReturnType<typeof createLoginForm>['controls'];

/**
 * Inicio de sesión (`/login`). Un error de la API, sea de credenciales, de demasiados intentos
 * o de conexión, se cuenta aquí mismo: la página ya está esperando esa respuesta.
 */
@Component({
  selector: 'app-login',
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
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  /** Adónde volver. Llega como `?returnUrl=` y se valida antes de usarlo. */
  readonly returnUrl = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly form = createLoginForm();
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly submitted = signal(false);
  // Los formularios reactivos no son signals: este pulso avisa de cada cambio.
  private readonly changes = toSignal(this.form.events);

  /** Quien se registra desde aquí vuelve también adonde quería ir. */
  protected registerParams() {
    return returnUrlParams(safeReturnUrl(this.returnUrl()));
  }

  protected errorOf(name: LoginControl): string | null {
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

    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    try {
      await this.auth.login({ email: email.trim(), password });
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (error) {
      this.error.set(toApiError(error).message);
    } finally {
      this.submitting.set(false);
    }
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid')?.focus(),
      { injector: this.injector },
    );
  }
}
