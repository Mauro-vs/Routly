import { Directive, computed, effect, inject, input, untracked } from '@angular/core';
import { Router } from '@angular/router';

import { BaseEntity } from '../../core/models/entity.model';
import { BreadcrumbService } from '../../core/services/breadcrumb.service';
import { EntityStore } from '../../core/services/entity.store';
import { DetailIdentifier } from '../components/detail-page/detail-page.component';

/**
 * Base de las páginas de detalle (`/<colección>/:slug`). Pide el registro por su
 * slug, pone su nombre en las migas, y reparte al store el cambio de estado y el
 * borrado. Cada página declara su `store` y los datos que enseña.
 */
@Directive()
export abstract class EntityDetailPage<T extends BaseEntity> {
  /** `slug` de la URL. */
  readonly slug = input.required<string>();

  protected abstract readonly store: EntityStore<T, unknown>;
  /** Ruta del listado, adonde se vuelve al eliminar. */
  protected abstract readonly listPath: string;

  private readonly router = inject(Router);
  private readonly breadcrumbs = inject(BreadcrumbService);

  /** El registro abierto, o null mientras carga (aunque el store aún guarde el anterior). */
  protected readonly record = computed(() => {
    const selected = this.store.selected();
    return selected?.slug === this.slug() ? selected : null;
  });
  /** La carga ha fallado por algo que no es un 404 (ese caso vuelve solo al listado). */
  protected readonly loadFailed = computed(
    () => !this.record() && !this.store.loading() && this.store.error() !== null,
  );
  protected readonly busy = computed(() => {
    const record = this.record();
    return record ? this.store.isBusy(record._id) : false;
  });
  protected readonly title = computed(() => {
    const record = this.record();
    return record ? this.store.displayName(record) : '';
  });
  protected readonly editPath = computed(() => [this.listPath, this.slug(), 'edit']);
  /** El identificador legible del registro: su slug. */
  protected readonly identifier = computed<DetailIdentifier | null>(() => {
    const record = this.record();
    return record ? { label: 'Slug', value: record.slug } : null;
  });

  constructor() {
    effect(() => {
      const slug = this.slug();
      untracked(() => void this.open(slug));
    });
  }

  protected setActive(isActive: boolean): void {
    const record = this.record();
    if (record) void this.store.setActive(record, isActive);
  }

  protected async remove(): Promise<void> {
    const record = this.record();
    if (record && (await this.store.confirmAndRemove(record))) {
      void this.router.navigateByUrl(this.listPath);
    }
  }

  protected retry(): void {
    void this.open(this.slug());
  }

  private async open(slug: string): Promise<void> {
    const record = await this.store.getBySlug(slug);
    if (record) this.breadcrumbs.set(this.store.displayName(record));
  }
}
