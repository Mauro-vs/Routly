import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Router } from '@angular/router';

import { REVIEW_TARGETS, ReviewPhoto } from '../../../../core/models/review.model';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { RatingStarsComponent } from '../../../../shared/components/rating-summary/rating-stars/rating-stars.component';
import { ReviewsStore } from '../../services/reviews.store';

/**
 * Detalle de una opinión (`/reviews/:id`): lo que ha escrito, sus fotos en grande y de quién y
 * sobre qué es. No se edita (es lo que ha escrito alguien): se oculta, se borra o se le quita
 * una foto.
 */
@Component({
  selector: 'app-review-detail',
  imports: [DetailPageComponent, DetailSectionComponent, FieldListComponent, IconComponent, RatingStarsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-detail.component.html',
  styleUrl: './review-detail.component.css',
})
export class ReviewDetailComponent {
  /** `id` de la URL. */
  readonly id = input.required<string>();

  protected readonly store = inject(ReviewsStore);
  private readonly router = inject(Router);
  private readonly breadcrumbs = inject(BreadcrumbService);

  protected readonly record = computed(() => {
    const selected = this.store.selected();
    return selected?._id === this.id() ? selected : null;
  });
  protected readonly loadFailed = computed(
    () => (!this.record() && !this.store.loading() && this.store.error()) || null,
  );
  protected readonly busy = computed(() => this.store.isBusy(this.id()));
  protected readonly title = computed(() => {
    const review = this.record();
    return review ? this.store.displayName(review) : '';
  });
  protected readonly subtitle = computed(() => {
    const review = this.record();
    if (!review) return '';
    const about = review.target ? `sobre ${review.target.name}` : 'sobre algo que ya no existe';
    return `De ${review.user?.name ?? 'un usuario eliminado'}, ${about}`;
  });

  protected readonly data = computed<FieldItem[]>(() => {
    const review = this.record();
    if (!review) return [];
    const target = REVIEW_TARGETS[review.targetType];
    const edited = review.updatedAt !== review.createdAt;
    return [
      {
        label: target.label,
        value: review.target?.name,
        relation: true,
        gender: review.targetType === 'experience' ? 'f' : 'm',
        link: review.target ? [target.path, review.target.slug] : null,
      },
      { label: 'Autor', value: review.user?.name, relation: true, link: review.user ? ['/users', 'id', review.user._id] : null },
      { label: 'Escrita', value: review.createdAt, format: 'datetime' },
      { label: 'Última edición', value: edited ? review.updatedAt : null, format: 'datetime', empty: 'Sin editar' },
      { label: 'Ha hecho la salida', value: review.verified ? 'Sí, verificada' : 'Sin verificar (aún no hay reservas)' },
      { label: 'Fotos', value: review.photos.length, format: 'number' },
    ];
  });

  constructor() {
    effect(() => {
      this.id();
      untracked(() => void this.open());
    });
  }

  protected async open(): Promise<void> {
    const review = await this.store.getOne(this.id());
    if (review) this.breadcrumbs.set(this.store.displayName(review));
  }

  protected setActive(isActive: boolean): void {
    const review = this.record();
    if (review) void this.store.setActive(review, isActive);
  }

  protected async remove(): Promise<void> {
    const review = this.record();
    if (review && (await this.store.confirmAndRemove(review))) {
      void this.router.navigateByUrl('/reviews');
    }
  }

  protected removePhoto(photo: ReviewPhoto): void {
    const review = this.record();
    if (review) void this.store.confirmAndRemovePhoto(review, photo);
  }
}
