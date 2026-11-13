import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthUser } from '../../../../auth/auth.models';
import { USER_LIMITS } from '../../../../core/models/user.model';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import {
  ProfileFieldsComponent,
  createProfileGroup,
  fillProfileGroup,
  profilePayload,
} from '../../../../shared/components/profile-fields/profile-fields.component';
import { applyServerErrors, controlErrorMessage } from '../../../../shared/utils/form-errors';
import { email, minTrimmed, notBlank } from '../../../../shared/utils/validators';
import { ProfileService } from '../../services/profile.service';

function createAccountForm() {
  return new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, minTrimmed(2), Validators.maxLength(USER_LIMITS.name)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, email, Validators.maxLength(USER_LIMITS.email)],
    }),
    profile: createProfileGroup(),
  });
}

/**
 * "Tus datos" de Mi perfil: nombre, email y perfil. Lo guarda el botón de la cabecera de la
 * página, que apunta a este formulario por su id (`profile-form`).
 */
@Component({
  selector: 'app-account-form',
  imports: [ReactiveFormsModule, FormFieldComponent, IconComponent, InputDirective, ProfileFieldsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form id="profile-form" class="card panel form-grid" [formGroup]="form" (ngSubmit)="save()" novalidate>
      <h2>Tus datos</h2>
      @if (formError(); as message) {
        <p class="form-error" role="alert"><ui-icon name="warning-circle" />{{ message }}</p>
      }
      <div class="form-row">
        <ui-form-field label="Nombre" [error]="errorOf('name')">
          <input uiInput type="text" name="name" formControlName="name" autocomplete="name" />
        </ui-form-field>
        <ui-form-field label="Correo electrónico" [error]="errorOf('email')">
          <input uiInput type="email" name="email" formControlName="email" autocomplete="email" spellcheck="false" />
        </ui-form-field>
      </div>
      <ui-profile-fields [group]="form.controls.profile" [submitted]="submitted()" />
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
  `,
})
export class AccountFormComponent {
  private readonly profile = inject(ProfileService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly notifications = inject(NotificationService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** El usuario de la sesión. */
  readonly user = input.required<AuthUser>();

  protected readonly form = createAccountForm();
  private readonly _saving = signal(false);
  /** Lo lee la página para el botón de la cabecera. */
  readonly saving = this._saving.asReadonly();
  protected readonly formError = signal<string | null>(null);
  protected readonly submitted = signal(false);

  // Los formularios reactivos no son signals: este pulso avisa de cada cambio.
  private readonly changes = toSignal(this.form.events);

  constructor() {
    // Se rellena al llegar el usuario, y no en cada cambio: lo que se escribe no se pierde.
    const userId = computed(() => this.user()._id);
    effect(() => {
      userId();
      untracked(() => this.fill());
    });
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty;
  }

  protected errorOf(name: 'name' | 'email'): string | null {
    this.changes();
    const control = this.form.controls[name];
    return control.touched || this.submitted() ? controlErrorMessage(control) : null;
  }

  protected async save(): Promise<void> {
    if (this._saving()) return;

    this.submitted.set(true);
    this.formError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }

    const { name, email } = this.form.getRawValue();
    const profile = profilePayload(this.form.controls.profile, this.user().profile);

    this._saving.set(true);
    try {
      await this.profile.update({
        name: name.trim(),
        email: email.trim(),
        ...(Object.keys(profile).length > 0 ? { profile } : {}),
      });
      this.fill();
      void this.notifications.success('Cambios guardados.');
    } catch (error) {
      this.showError(error);
    } finally {
      this._saving.set(false);
    }
  }

  private fill(): void {
    const user = this.user();
    this.form.patchValue({ name: user.name, email: user.email });
    fillProfileGroup(this.form.controls.profile, user.profile);
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.submitted.set(false);
  }

  private showError(error: unknown): void {
    const apiError = this.errors.handle(error, { inline: true });
    if (apiError.fieldErrors) {
      const unmatched = Object.values(applyServerErrors(this.form, apiError.fieldErrors));
      if (unmatched.length > 0) this.formError.set(unmatched.join(' '));
      this.focusFirstInvalid();
    } else if (apiError.isConflict) {
      applyServerErrors(this.form, { email: apiError.message });
      this.focusFirstInvalid();
    } else if (apiError.type === 'validation') {
      this.formError.set(apiError.message);
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
