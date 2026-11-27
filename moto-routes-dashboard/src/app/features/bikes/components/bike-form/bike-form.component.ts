import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import {
  BIKE_LIMITS,
  BIKE_TYPE_LABELS,
  Bike,
  BikeModification,
  BikePayload,
  BikeType,
  MODIFICATION_TYPE_LABELS,
  ModificationType,
} from '../../../../core/models/bike.model';
import { User } from '../../../../core/models/user.model';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { ReadonlyFieldComponent } from '../../../../shared/components/form-field/readonly-field/readonly-field.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EntityForm, editedText, optionalText } from '../../../../shared/forms/entity-form';
import { controlErrorMessage } from '../../../../shared/utils/form-errors';
import { integer, notBlank, positive } from '../../../../shared/utils/validators';

const TYPE_OPTIONS = Object.entries(BIKE_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const MODIFICATION_OPTIONS = Object.entries(MODIFICATION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function notInFuture(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'string' || value === '') return null;
  return new Date(value).getTime() <= Date.now() ? null : { notFuture: true };
}

const number = (...validators: ((control: AbstractControl) => ValidationErrors | null)[]) =>
  new FormControl<number | null>(null, validators);

// Los mismos criterios que src/schemas/bike.schema.js en la API.
function createBikeForm() {
  return new FormGroup({
    userId: new FormControl('', { nonNullable: true }),
    brand: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(BIKE_LIMITS.brand)],
    }),
    model: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(BIKE_LIMITS.model)],
    }),
    version: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(BIKE_LIMITS.version)] }),
    nickname: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(BIKE_LIMITS.nickname)] }),
    type: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    color: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(BIKE_LIMITS.color)] }),
    year: number(integer, Validators.min(BIKE_LIMITS.yearMin), (control) =>
      Validators.max(new Date().getFullYear() + 1)(control),
    ),
    cc: number(integer, Validators.min(BIKE_LIMITS.ccMin), Validators.max(BIKE_LIMITS.ccMax)),
    hp: number(positive, Validators.max(BIKE_LIMITS.hp)),
    torque: number(positive, Validators.max(BIKE_LIMITS.torque)),
    weight: number(Validators.min(BIKE_LIMITS.weightMin), Validators.max(BIKE_LIMITS.weightMax)),
    seatHeight: number(integer, Validators.min(BIKE_LIMITS.seatHeightMin), Validators.max(BIKE_LIMITS.seatHeightMax)),
    km: number(integer, Validators.min(0), Validators.max(BIKE_LIMITS.km)),
    isPublic: new FormControl(true, { nonNullable: true }),
    modifications: new FormArray<ReturnType<typeof createModification>>([]),
  });
}

function createModification(modification?: BikeModification) {
  return new FormGroup({
    type: new FormControl(modification?.type ?? 'other', { nonNullable: true }),
    title: new FormControl(modification?.title ?? '', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(BIKE_LIMITS.modificationTitle)],
    }),
    description: new FormControl(modification?.description ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(BIKE_LIMITS.modificationDescription)],
    }),
    date: new FormControl(modification?.date?.slice(0, 10) ?? '', {
      nonNullable: true,
      validators: [notInFuture],
    }),
  });
}

type BikeControls = ReturnType<typeof createBikeForm>['controls'];
type ModificationGroup = ReturnType<typeof createModification>;

const NUMERIC = ['year', 'cc', 'hp', 'torque', 'weight', 'seatHeight', 'km'] as const;

/**
 * Campos de una moto, por bloques: identidad, ficha técnica y modificaciones. El carnet no es
 * un campo: lo calcula la API y aquí solo se muestra.
 */
@Component({
  selector: 'app-bike-form',
  imports: [ReactiveFormsModule, FormFieldComponent, IconComponent, InputDirective, ReadonlyFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bike-form.component.html',
  styleUrl: './bike-form.component.css',
})
export class BikeFormComponent extends EntityForm<Bike, BikePayload, BikeControls> {
  /** Solo para el admin: a nombre de quién se da de alta. */
  readonly owners = input<readonly User[] | null>(null);
  readonly ownersLoading = input(false);

  protected readonly limits = BIKE_LIMITS;
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly modificationOptions = MODIFICATION_OPTIONS;
  protected override readonly errorMessages = {
    notFuture: () => 'No puede ser una fecha futura.',
  };

  protected readonly canChooseOwner = computed(() => !this.isEdit() && this.owners() !== null);
  protected readonly ownersHint = computed(() => (this.ownersLoading() ? 'Cargando usuarios…' : ''));

  protected get modifications(): FormArray<ModificationGroup> {
    return this.form.controls.modifications;
  }

  constructor() {
    super(createBikeForm());
  }

  protected addModification(): void {
    if (this.modifications.length >= BIKE_LIMITS.modifications) return;
    this.modifications.push(createModification());
    this.form.markAsDirty();
  }

  protected removeModification(index: number): void {
    this.modifications.removeAt(index);
    this.form.markAsDirty();
  }

  protected modificationError(group: ModificationGroup, name: 'title' | 'description' | 'date'): string | null {
    this.changes();
    const control = group.controls[name];
    return control.touched || this.submitted() ? controlErrorMessage(control, this.errorMessages) : null;
  }

  protected fill(bike: Bike | null): void {
    this.modifications.clear();
    bike?.modifications.forEach((modification) => this.modifications.push(createModification(modification)));
    this.form.reset({
      userId: '',
      brand: bike?.brand ?? '',
      model: bike?.model ?? '',
      version: bike?.version ?? '',
      nickname: bike?.nickname ?? '',
      type: bike?.type ?? '',
      color: bike?.color ?? '',
      year: bike?.year ?? null,
      cc: bike?.cc ?? null,
      hp: bike?.hp ?? null,
      torque: bike?.torque ?? null,
      weight: bike?.weight ?? null,
      seatHeight: bike?.seatHeight ?? null,
      km: bike?.km ?? null,
      isPublic: bike?.isPublic ?? true,
    });
  }

  private modificationsPayload(): BikeModification[] {
    return this.modifications.getRawValue().map(({ type, title, description, date }) => ({
      type: type as ModificationType,
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(date ? { date } : {}),
    }));
  }

  protected toPayload(): BikePayload {
    const value = this.form.getRawValue();
    const modifications = this.modificationsPayload();
    const numbers: Partial<BikePayload> = {};
    for (const name of NUMERIC) {
      if (value[name] !== null) numbers[name] = value[name];
    }

    return {
      brand: value.brand.trim(),
      model: value.model.trim(),
      type: value.type as BikeType,
      isPublic: value.isPublic,
      ...numbers,
      ...(value.userId ? { userId: value.userId } : {}),
      ...(optionalText(value.version) ? { version: value.version.trim() } : {}),
      ...(optionalText(value.nickname) ? { nickname: value.nickname.trim() } : {}),
      ...(optionalText(value.color) ? { color: value.color.trim() } : {}),
      ...(modifications.length > 0 ? { modifications } : {}),
    };
  }

  /** Al editar, un campo vaciado va como `null`, y las modificaciones van enteras. */
  protected override toUpdatePayload(): Partial<BikePayload> {
    const bike = this.record();
    const value = this.form.getRawValue();
    const changes: Partial<BikePayload> = {};
    for (const name of ['version', 'nickname', 'color'] as const) {
      const text = editedText(value[name], bike?.[name]);
      if (text !== undefined) changes[name] = text;
    }
    for (const name of NUMERIC) {
      if (value[name] !== null) changes[name] = value[name];
      else if (bike?.[name] !== undefined) changes[name] = null;
    }

    return {
      brand: value.brand.trim(),
      model: value.model.trim(),
      type: value.type as BikeType,
      isPublic: value.isPublic,
      modifications: this.modificationsPayload(),
      ...changes,
    };
  }
}
