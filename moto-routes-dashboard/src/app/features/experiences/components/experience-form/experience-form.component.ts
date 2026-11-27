import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { ApiError } from '../../../../core/models/api-error.model';
import { Bike, bikeName } from '../../../../core/models/bike.model';
import {
  EXPERIENCE_LANGUAGES,
  EXPERIENCE_LIMITS,
  Experience,
  ExperiencePayload,
  languageName,
} from '../../../../core/models/experience.model';
import { Host } from '../../../../core/models/host.model';
import { Route } from '../../../../core/models/route.model';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EntityForm, editedText, optionalText } from '../../../../shared/forms/entity-form';
import { SelectOption, withCurrent } from '../../../../shared/forms/select-options';
import { integer, minTrimmed, notBlank, positive } from '../../../../shared/utils/validators';

/** El mínimo de participantes no puede superar al máximo. El error queda en el grupo. */
function participantsInOrder(group: AbstractControl): ValidationErrors | null {
  const min: unknown = group.get('minParticipants')?.value;
  const max: unknown = group.get('maxParticipants')?.value;
  return typeof min === 'number' && typeof max === 'number' && max < min
    ? { participants: true }
    : null;
}

// Los mismos criterios que src/schemas/experience.schema.js en la API.
function createExperienceForm() {
  return new FormGroup(
    {
      hostId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      guideBikeId: new FormControl('', { nonNullable: true }),
      routeId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      title: new FormControl('', {
        nonNullable: true,
        validators: [
          notBlank,
          minTrimmed(EXPERIENCE_LIMITS.titleMin),
          Validators.maxLength(EXPERIENCE_LIMITS.title),
        ],
      }),
      description: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(EXPERIENCE_LIMITS.description)],
      }),
      meetingPoint: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(EXPERIENCE_LIMITS.meetingPoint)],
      }),
      language: new FormControl('es', { nonNullable: true, validators: [Validators.required] }),
      duration: new FormControl<number | null>(null, [
        Validators.required,
        positive,
        Validators.max(EXPERIENCE_LIMITS.duration),
      ]),
      minParticipants: new FormControl<number | null>(1, [
        Validators.required,
        Validators.min(1),
        integer,
      ]),
      maxParticipants: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(1),
        Validators.max(EXPERIENCE_LIMITS.maxParticipants),
        integer,
      ]),
    },
    { validators: participantsInOrder },
  );
}

type ExperienceControls = ReturnType<typeof createExperienceForm>['controls'];

/**
 * Campos de una experiencia: quién la organiza y sobre qué ruta, lo que se cuenta de
 * ella, y el grupo (idioma, duración y plazas). El mínimo de plazas no puede superar
 * al máximo, como en la API.
 */
@Component({
  selector: 'app-experience-form',
  imports: [ReactiveFormsModule, FormFieldComponent, InputDirective, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experience-form.component.html',
})
export class ExperienceFormComponent extends EntityForm<
  Experience,
  ExperiencePayload,
  ExperienceControls
> {
  readonly hosts = input<readonly Host[]>([]);
  readonly routes = input<readonly Route[]>([]);
  /** Las opciones de los selects aún no han llegado. */
  readonly optionsLoading = input(false);
  /** Las motos activas y públicas del anfitrión elegido. */
  readonly guideBikes = input<readonly Bike[]>([]);
  readonly guideBikesLoading = input(false);
  /** Se ha elegido otro anfitrión: hay que pedir sus motos. */
  readonly hostChange = output<string>();

  protected readonly limits = EXPERIENCE_LIMITS;

  protected readonly hostOptions = computed<SelectOption[]>(() => {
    const options = this.hosts().map((host) => ({ value: host._id, label: host.name }));
    const current = this.record()?.host;
    return withCurrent(
      options,
      current && { value: current._id, label: current.name },
      !this.optionsLoading(),
      'm',
    );
  });

  protected readonly routeOptions = computed<SelectOption[]>(() => {
    const options = this.routes().map((route) => ({ value: route._id, label: route.title }));
    const current = this.record()?.route;
    return withCurrent(
      options,
      current && { value: current._id, label: current.title },
      !this.optionsLoading(),
      'f',
    );
  });

  protected readonly guideOptions = computed<SelectOption[]>(() => {
    this.changes();
    const options = this.guideBikes().map((bike) => ({ value: bike._id, label: bikeName(bike) }));
    // La moto guardada solo vale con su anfitrión: con otro, ya no es una opción.
    const record = this.record();
    const sameHost = record?.hostId === this.form.controls.hostId.value;
    const current = sameHost ? record?.guideBike : null;
    return withCurrent(
      options,
      current && { value: current._id, label: bikeName(current) },
      !this.guideBikesLoading(),
      'f',
    );
  });

  protected readonly guideHint = computed(() => {
    this.changes();
    if (!this.form.controls.hostId.value) return 'Elige antes un anfitrión.';
    if (this.guideBikesLoading()) return 'Cargando sus motos…';
    return this.guideOptions().length === 0 ? 'Este anfitrión no tiene motos activas y públicas.' : '';
  });

  /** Los idiomas de la lista y, si la experiencia tiene otro, también ese. */
  protected readonly languageOptions = computed<SelectOption[]>(() => {
    const options = Object.entries(EXPERIENCE_LANGUAGES).map(([value, label]) => ({ value, label }));
    const current = this.record()?.language;
    return current && !(current in EXPERIENCE_LANGUAGES)
      ? [...options, { value: current, label: languageName(current) }]
      : options;
  });

  protected readonly participantsError = computed(() => {
    this.changes();
    const max = this.form.controls.maxParticipants;
    return (max.touched || this.submitted()) && this.form.hasError('participants')
      ? 'No puede ser menor que el mínimo de participantes.'
      : null;
  });

  constructor() {
    super(createExperienceForm());
  }

  /** La moto es del anfitrión: al cambiarlo, la elegida ya no vale. */
  protected hostChanged(event: Event): void {
    this.form.controls.guideBikeId.setValue('');
    // Del propio select: el formulario puede no haberse enterado aún del cambio.
    this.hostChange.emit((event.target as HTMLSelectElement).value);
  }

  protected fill(experience: Experience | null): void {
    this.form.reset({
      hostId: experience?.hostId ?? '',
      guideBikeId: experience?.guideBikeId ?? '',
      routeId: experience?.routeId ?? '',
      title: experience?.title ?? '',
      description: experience?.description ?? '',
      meetingPoint: experience?.meetingPoint ?? '',
      language: experience?.language ?? 'es',
      duration: experience?.duration ?? null,
      minParticipants: experience?.minParticipants ?? 1,
      maxParticipants: experience?.maxParticipants ?? null,
    });
  }

  protected toPayload(): ExperiencePayload | null {
    const value = this.form.getRawValue();
    const { duration, minParticipants, maxParticipants } = value;
    // Con el formulario válido tienen valor; la comprobación es para el tipo.
    if (duration === null || minParticipants === null || maxParticipants === null) return null;

    return {
      hostId: value.hostId,
      routeId: value.routeId,
      title: value.title.trim(),
      description: optionalText(value.description),
      meetingPoint: optionalText(value.meetingPoint),
      language: value.language,
      duration,
      minParticipants,
      maxParticipants,
      ...(value.guideBikeId ? { guideBikeId: value.guideBikeId } : {}),
    };
  }

  protected override toUpdatePayload(): Partial<ExperiencePayload> | null {
    const payload = this.toPayload();
    const experience = this.record();
    if (!payload || !experience) return payload;

    const value = this.form.getRawValue();
    return {
      ...payload,
      description: editedText(value.description, experience.description),
      meetingPoint: editedText(value.meetingPoint, experience.meetingPoint),
      ...(!value.guideBikeId && experience.guideBikeId ? { guideBikeId: null } : {}),
    };
  }

  // El 409 al guardar: bajar el máximo por debajo de las plazas de una salida.
  protected override conflictField(error: ApiError): string | null {
    return error.detail?.startsWith('maxParticipants') ? 'maxParticipants' : null;
  }
}
