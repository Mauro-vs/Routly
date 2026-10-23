import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiError } from '../../../../core/models/api-error.model';
import { Role } from '../../../../core/models/role.model';
import { USER_LIMITS, User, UserPayload } from '../../../../core/models/user.model';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EntityForm } from '../../../../shared/forms/entity-form';
import { SelectOption, withCurrent } from '../../../../shared/forms/select-options';
import { minTrimmed, notBlank } from '../../../../shared/utils/validators';

const PASSWORD_VALIDATORS = [
  Validators.required,
  Validators.minLength(USER_LIMITS.passwordMin),
  Validators.maxLength(USER_LIMITS.passwordMax),
];

// Los mismos criterios que src/schemas/user.schema.js en la API.
function createUserForm() {
  return new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, minTrimmed(2), Validators.maxLength(USER_LIMITS.name)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.email, Validators.maxLength(USER_LIMITS.email)],
    }),
    // Vacío: la API le pone el rol rider.
    roleId: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true, validators: PASSWORD_VALIDATORS }),
  });
}

type UserControls = ReturnType<typeof createUserForm>['controls'];

/**
 * Campos de un usuario. La contraseña es de solo escritura: la API nunca la
 * devuelve. Al crear es obligatoria; al editar solo se envía si se marca "Cambiar la
 * contraseña".
 */
@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, FormFieldComponent, InputDirective, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [id]="formId" class="card panel form-grid" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @if (formError(); as message) {
        <p class="form-error" role="alert"><ui-icon name="warning-circle" />{{ message }}</p>
      }

      <div class="form-row">
        <ui-form-field label="Nombre" [counter]="counter('name', limits.name)" [error]="errorOf('name')">
          <input uiInput type="text" name="name" formControlName="name" autocomplete="off" />
        </ui-form-field>
        <ui-form-field label="Email" [error]="errorOf('email')">
          <input uiInput type="email" name="email" formControlName="email" autocomplete="off" spellcheck="false" />
        </ui-form-field>
      </div>

      <ui-form-field
        label="Rol"
        [hint]="rolesLoading() ? 'Cargando roles…' : 'Sin elegir, la API le asigna el rol rider.'"
        [error]="errorOf('roleId')"
      >
        <select uiInput class="select" name="roleId" formControlName="roleId">
          @if (!isEdit()) {
            <option value="">Por defecto (rider)</option>
          }
          @for (option of roleOptions(); track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </ui-form-field>

      @if (isEdit()) {
        <label class="check">
          <input type="checkbox" name="changePassword" [checked]="changePassword()" (change)="toggleChangePassword()" />
          Cambiar la contraseña
        </label>
      }

      @if (!isEdit() || changePassword()) {
        <ui-form-field
          [label]="isEdit() ? 'Contraseña nueva' : 'Contraseña'"
          [hint]="'Entre ' + limits.passwordMin + ' y ' + limits.passwordMax + ' caracteres. No se vuelve a mostrar.'"
          [error]="errorOf('password')"
        >
          <input uiInput type="password" name="password" formControlName="password" autocomplete="new-password" />
        </ui-form-field>
      }
    </form>
  `,
  styles: `
    .check {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-height: 32px;
      font-size: var(--text-sm);
      font-weight: 600;
      cursor: pointer;
    }

    .check input {
      width: 18px;
      height: 18px;
      margin: 0;
    }
  `,
})
export class UserFormComponent extends EntityForm<User, UserPayload, UserControls> {
  readonly roles = input<readonly Role[]>([]);
  readonly rolesLoading = input(false);

  protected readonly limits = USER_LIMITS;
  /** Al editar, si se va a cambiar la contraseña. */
  protected readonly changePassword = signal(false);

  protected readonly roleOptions = computed<SelectOption[]>(() => {
    const options = this.roles().map((role) => ({ value: role._id, label: role.label }));
    const current = this.record()?.role;
    return withCurrent(
      options,
      current && { value: current._id, label: current.label },
      !this.rolesLoading(),
      'm',
    );
  });

  constructor() {
    super(createUserForm());

    // La contraseña solo cuenta al crear o si se va a cambiar.
    effect(() => {
      const control = this.form.controls.password;
      if (!this.isEdit() || this.changePassword()) control.enable({ emitEvent: false });
      else control.disable({ emitEvent: false });
    });
  }

  protected toggleChangePassword(): void {
    this.changePassword.update((change) => !change);
    this.form.controls.password.setValue('');
    this.form.controls.password.markAsUntouched();
  }

  protected fill(user: User | null): void {
    this.changePassword.set(false);
    this.form.reset({
      name: user?.name ?? '',
      email: user?.email ?? '',
      roleId: user?.roleId ?? '',
      password: '',
    });
  }

  protected toPayload(): UserPayload {
    const { name, email, roleId, password } = this.form.getRawValue();
    return { name: name.trim(), email: email.trim(), password, ...(roleId ? { roleId } : {}) };
  }

  protected override toUpdatePayload(): Partial<UserPayload> {
    const { name, email, roleId, password } = this.form.getRawValue();
    return {
      name: name.trim(),
      email: email.trim(),
      roleId,
      ...(this.changePassword() ? { password } : {}),
    };
  }

  // 409: un email repetido, o cambiar de rol a alguien con perfil de anfitrión.
  protected override conflictField(error: ApiError): string {
    return error.detail?.includes('host profile') ? 'roleId' : 'email';
  }
}
