import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  EXPERIENCE_LEVEL_LABELS,
  ExperienceLevel,
  PHONE_PATTERN,
  PROFILE_LIMITS,
  Profile,
  ProfilePayload,
} from '../../../core/models/profile.model';
import { editedText } from '../../forms/entity-form';
import { ErrorMessage, controlErrorMessage } from '../../utils/form-errors';
import { bothOrNone } from '../../utils/validators';
import { FormFieldComponent } from '../form-field/form-field.component';
import { InputDirective } from '../form-field/input.directive';

function oldEnough(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'string' || value === '') return null;

  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - PROFILE_LIMITS.minAge);
  return new Date(value) <= limit ? null : { minAge: true };
}

/** Los campos del perfil, con los mismos criterios que src/schemas/profile.schema.js. */
export function createProfileGroup() {
  return new FormGroup(
    {
      bio: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(PROFILE_LIMITS.bio)] }),
      phone: new FormControl('', { nonNullable: true, validators: [Validators.pattern(PHONE_PATTERN)] }),
      city: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(PROFILE_LIMITS.city)] }),
      birthDate: new FormControl('', { nonNullable: true, validators: [oldEnough] }),
      experienceLevel: new FormControl('', { nonNullable: true }),
      contactName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(PROFILE_LIMITS.contactName)],
      }),
      contactPhone: new FormControl('', { nonNullable: true, validators: [Validators.pattern(PHONE_PATTERN)] }),
    },
    { validators: bothOrNone('contactName', 'contactPhone') },
  );
}

export type ProfileGroup = ReturnType<typeof createProfileGroup>;

export function fillProfileGroup(group: ProfileGroup, profile: Profile | null | undefined): void {
  group.reset({
    bio: profile?.bio ?? '',
    phone: profile?.phone ?? '',
    city: profile?.city ?? '',
    birthDate: profile?.birthDate?.slice(0, 10) ?? '',
    experienceLevel: profile?.experienceLevel ?? '',
    contactName: profile?.emergencyContact?.name ?? '',
    contactPhone: profile?.emergencyContact?.phone ?? '',
  });
}

/**
 * Lo que hay que enviar del perfil. Un campo vacío que antes tenía algo va como `null` (la
 * API lo borra), y el que ya estaba vacío no se envía. El contacto va siempre entero.
 */
export function profilePayload(group: ProfileGroup, previous: Profile | null | undefined): ProfilePayload {
  const value = group.getRawValue();
  const contactName = value.contactName.trim();
  const contactPhone = value.contactPhone.trim();

  const payload: ProfilePayload = {
    bio: editedText(value.bio, previous?.bio),
    phone: editedText(value.phone, previous?.phone),
    city: editedText(value.city, previous?.city),
    birthDate: editedText(value.birthDate, previous?.birthDate),
    experienceLevel: (editedText(value.experienceLevel, previous?.experienceLevel) ??
      undefined) as ExperienceLevel | undefined,
    emergencyContact:
      contactName && contactPhone
        ? { name: contactName, phone: contactPhone }
        : previous?.emergencyContact
          ? null
          : undefined,
  };
  if (!value.experienceLevel && previous?.experienceLevel) payload.experienceLevel = null;

  return Object.fromEntries(Object.entries(payload).filter(([, field]) => field !== undefined));
}

const MESSAGES: Record<string, ErrorMessage> = {
  pattern: () => 'Usa el formato internacional, por ejemplo +34600111222.',
  minAge: () => `Hay que tener al menos ${PROFILE_LIMITS.minAge} años.`,
};

/**
 * Los campos del perfil de un usuario, repartidos en dos bloques. Los usan "Mi perfil" y el
 * formulario de usuario del panel: es la misma información.
 */
@Component({
  selector: 'ui-profile-fields',
  imports: [ReactiveFormsModule, FormFieldComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-fields.component.html',
  styleUrl: './profile-fields.component.css',
})
export class ProfileFieldsComponent {
  readonly group = input.required<ProfileGroup>();
  /** Se ha intentado enviar: los errores se ven aunque el campo no se haya tocado. */
  readonly submitted = input(false);

  protected readonly levels = Object.entries(EXPERIENCE_LEVEL_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  // Los formularios reactivos no son signals: este pulso avisa de cada cambio.
  private readonly changes = signal(0);

  protected readonly bioCounter = computed(() => {
    this.changes();
    return `${this.group().controls.bio.value.length} / ${PROFILE_LIMITS.bio}`;
  });

  protected readonly contactError = computed(() => {
    this.changes();
    const group = this.group();
    const touched = group.controls.contactName.touched || group.controls.contactPhone.touched;
    return (touched || this.submitted()) && group.hasError('pair')
      ? 'Indica el nombre y el teléfono, o ninguno de los dos.'
      : null;
  });

  constructor() {
    effect((onCleanup) => {
      const subscription: Subscription = this.group().events.subscribe(() =>
        this.changes.update((count) => count + 1),
      );
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected errorOf(name: keyof ProfileGroup['controls']): string | null {
    this.changes();
    const control = this.group().controls[name];
    return control.touched || this.submitted() ? controlErrorMessage(control, MESSAGES) : null;
  }
}
