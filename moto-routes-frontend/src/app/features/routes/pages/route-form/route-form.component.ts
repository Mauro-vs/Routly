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
import { Router, RouterLink } from '@angular/router';

import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  ROUTE_LIMITS,
  RouteDifficulty,
  RoutePayload,
} from '../../../../core/models/route.model';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ToggleComponent } from '../../../../shared/components/toggle/toggle.component';
import { formatDate, formatRelativeTime } from '../../../../shared/utils/format';
import { applyServerErrors, controlErrorMessage } from '../../../../shared/utils/form-errors';
import { notBlank } from '../../../../shared/utils/validators';
import { RoutesStore } from '../../services/routes.store';

type FieldName =
  | 'title'
  | 'description'
  | 'startPoint'
  | 'endPoint'
  | 'difficulty'
  | 'distance'
  | 'duration';

const LIST_PATH = '/routes';

/**
 * Formulario de una ruta. Sirve para crear (`/routes/new`) y para editar
 * (`/routes/:slug/edit`). Valida en el cliente con los mismos criterios que la API
 * y, si aun así la API rechaza algo, pinta su mensaje junto al campo.
 */
@Component({
  selector: 'app-route-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    EmptyStateComponent,
    FormFieldComponent,
    InputDirective,
    IconComponent,
    PageHeaderComponent,
    SkeletonComponent,
    ToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './route-form.component.html',
  styleUrl: './route-form.component.css',
})
export class RouteFormComponent implements HasUnsavedChanges {
  /** `slug` de la URL. No llega al crear. */
  readonly slug = input<string>();

  protected readonly store = inject(RoutesStore);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly breadcrumbs = inject(BreadcrumbService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly limits = ROUTE_LIMITS;
  protected readonly listPath = LIST_PATH;
  protected readonly difficulties = DIFFICULTIES.map((value) => ({
    value,
    label: DIFFICULTY_LABELS[value],
  }));

  // Los mismos criterios que src/schemas/route.schema.js en la API.
  protected readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(ROUTE_LIMITS.title)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(ROUTE_LIMITS.description)],
    }),
    startPoint: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(ROUTE_LIMITS.point)],
    }),
    endPoint: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(ROUTE_LIMITS.point)],
    }),
    difficulty: new FormControl<RouteDifficulty | null>(null, Validators.required),
    distance: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    duration: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
  });
  // Los formularios reactivos no son signals: este pulso avisa de cada cambio.
  private readonly formChanges = toSignal(this.form.events);

  protected readonly isEdit = computed(() => !!this.slug());
  /** La ruta que se edita. Al crear es null aunque el store conserve la última abierta. */
  protected readonly route = computed(() => (this.isEdit() ? this.store.selected() : null));
  protected readonly saving = this.store.saving;
  /** Al editar, la ruta aún no ha llegado. */
  protected readonly loading = computed(() => this.isEdit() && !this.route());
  /** La carga ha fallado por algo que no es un 404 (ese caso vuelve solo al listado). */
  protected readonly loadFailed = computed(
    () => this.loading() && !this.store.loading() && this.store.error() !== null,
  );
  protected readonly submitted = signal(false);
  /** Error que no pertenece a ningún campo concreto. */
  protected readonly formError = signal<string | null>(null);
  /** Al crear, el estado se decide aquí y se aplica al guardar. */
  private readonly activeOnCreate = signal(true);
  private leaving = false;

  protected readonly heading = computed(() =>
    this.isEdit() ? (this.route()?.title ?? 'Editar ruta') : 'Nueva ruta',
  );
  protected readonly isActive = computed(() => this.route()?.isActive ?? this.activeOnCreate());
  protected readonly titleCounter = computed(() => this.counter('title', ROUTE_LIMITS.title));
  protected readonly descriptionCounter = computed(() =>
    this.counter('description', ROUTE_LIMITS.description),
  );
  protected readonly details = computed(() => {
    const route = this.route();
    return route
      ? {
          slug: route.slug,
          created: formatDate(route.createdAt),
          updated: formatRelativeTime(route.updatedAt),
        }
      : null;
  });

  constructor() {
    effect(() => {
      const slug = this.slug();
      untracked(() => void this.open(slug));
    });
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.leaving;
  }

  protected errorOf(name: FieldName): string | null {
    this.formChanges();
    const control = this.form.controls[name];
    return control.touched || this.submitted() ? controlErrorMessage(control) : null;
  }

  protected setActive(isActive: boolean): void {
    const route = this.route();
    if (route) void this.store.setActive(route, isActive);
    else this.activeOnCreate.set(isActive);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;

    this.submitted.set(true);
    this.formError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }

    const payload = this.toPayload();
    if (!payload) return;

    const current = this.route();
    const result = current
      ? await this.store.update(current._id, payload)
      : await this.store.create(payload);

    if (!result.ok) {
      this.showError(result.error);
      return;
    }

    // La API crea siempre rutas activas: si se pidió inactiva, hace falta otra llamada.
    if (!current && !this.activeOnCreate()) await this.store.setActive(result.data, false);

    void this.notifications.success(current ? 'Cambios guardados.' : 'Ruta creada.');
    this.leave();
  }

  protected retry(): void {
    void this.open(this.slug());
  }

  protected async remove(): Promise<void> {
    const route = this.route();
    if (route && (await this.store.confirmAndRemove(route))) this.leave();
  }

  private async open(slug: string | undefined): Promise<void> {
    this.submitted.set(false);
    this.formError.set(null);

    if (!slug) {
      this.store.clearSelected();
      this.form.reset();
      return;
    }

    const route = await this.store.getBySlug(slug);
    if (!route) return;

    this.form.reset({
      title: route.title,
      description: route.description ?? '',
      startPoint: route.startPoint,
      endPoint: route.endPoint,
      difficulty: route.difficulty,
      distance: route.distance,
      duration: route.duration,
    });
    this.breadcrumbs.set(route.title);
  }

  private toPayload(): RoutePayload | null {
    const { title, description, startPoint, endPoint, difficulty, distance, duration } =
      this.form.getRawValue();
    // Con el formulario válido estos tres campos tienen valor; la comprobación es para el tipo.
    if (difficulty === null || distance === null || duration === null) return null;

    return {
      title: title.trim(),
      description: description.trim(),
      startPoint: startPoint.trim(),
      endPoint: endPoint.trim(),
      difficulty,
      distance,
      duration,
    };
  }

  /** Reparte el error de la API: en su campo si se puede, y si no, sobre el formulario. */
  private showError(error: ApiError): void {
    if (error.fieldErrors) {
      const unmatched = Object.values(applyServerErrors(this.form, error.fieldErrors));
      if (unmatched.length > 0) this.formError.set(unmatched.join(' '));
      this.focusFirstInvalid();
    } else if (error.isConflict) {
      // El único duplicado posible es la dirección (slug), que sale del título.
      applyServerErrors(this.form, {
        title: 'Ya existe una ruta con esa dirección. Cambia un poco el título.',
      });
      this.focusFirstInvalid();
    } else if (error.type === 'validation') {
      this.formError.set(error.message);
    }
    // Red, tiempo de espera, 5xx y 404 ya los ha mostrado ErrorHandlerService.
  }

  private counter(name: 'title' | 'description', max: number): string {
    this.formChanges();
    return `${this.form.controls[name].value.length} / ${max}`;
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid')
          ?.focus(),
      { injector: this.injector },
    );
  }

  private leave(): void {
    this.leaving = true;
    void this.router.navigateByUrl(LIST_PATH);
  }
}
