import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { RoutePayload } from '../../../../core/models/route.model';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ToggleComponent } from '../../../../shared/components/toggle/toggle.component';
import { formatDate, formatRelativeTime } from '../../../../shared/utils/format';
import {
  ROUTE_FORM_ID,
  RouteFormComponent,
} from '../../components/route-form/route-form.component';
import { RoutesStore } from '../../services/routes.store';

const LIST_PATH = '/routes';

/**
 * Página para crear (`/routes/new`) y editar (`/routes/:slug/edit`) una ruta. Carga
 * la ruta y las opciones de los selects, y guarda lo que emite el formulario
 * (`app-route-form`). Si la API rechaza algo, se lo devuelve al formulario para que lo
 * pinte junto al campo.
 */
@Component({
  selector: 'app-route-form-page',
  imports: [
    RouterLink,
    ErrorStateComponent,
    IconComponent,
    PageHeaderComponent,
    RouteFormComponent,
    SkeletonComponent,
    ToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './route-form.component.html',
  styleUrl: './route-form.component.css',
})
export class RouteFormPageComponent implements HasUnsavedChanges {
  /** `slug` de la URL. No llega al crear. */
  readonly slug = input<string>();

  protected readonly store = inject(RoutesStore);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly breadcrumbs = inject(BreadcrumbService);

  private readonly form = viewChild(RouteFormComponent);

  protected readonly formId = ROUTE_FORM_ID;
  protected readonly listPath = LIST_PATH;

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
  /** Las opciones de los selects se están pidiendo. */
  protected readonly optionsLoading = this.store.optionsLoading;
  /** Al crear, el estado se decide aquí y se aplica al guardar. */
  private readonly activeOnCreate = signal(true);
  private leaving = false;

  protected readonly heading = computed(() =>
    this.isEdit() ? (this.route()?.title ?? 'Editar ruta') : 'Nueva ruta',
  );
  protected readonly isActive = computed(() => this.route()?.isActive ?? this.activeOnCreate());
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
    // Las opciones se piden cada vez que se abre el formulario: puede haber
    // categorías o ubicaciones nuevas, o que alguna se haya desactivado.
    void this.store.loadOptions();

    effect(() => {
      const slug = this.slug();
      untracked(() => void this.open(slug));
    });
  }

  hasUnsavedChanges(): boolean {
    return (this.form()?.dirty() ?? false) && !this.leaving;
  }

  protected setActive(isActive: boolean): void {
    const route = this.route();
    if (route) void this.store.setActive(route, isActive);
    else this.activeOnCreate.set(isActive);
  }

  protected async save(payload: RoutePayload): Promise<void> {
    if (this.saving()) return;

    const current = this.route();
    const result = current
      ? await this.store.update(current._id, payload)
      : await this.store.create(payload);

    if (!result.ok) {
      this.form()?.showServerError(result.error);
      return;
    }

    // La API crea siempre rutas activas: si se pidió inactiva, hace falta otra llamada.
    if (!current && !this.activeOnCreate()) await this.store.setActive(result.data, false);

    this.form()?.markSaved();
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
    if (!slug) {
      this.store.clearSelected();
      return;
    }

    const route = await this.store.getBySlug(slug);
    if (route) this.breadcrumbs.set(route.title);
  }

  private leave(): void {
    this.leaving = true;
    void this.router.navigateByUrl(LIST_PATH);
  }
}
