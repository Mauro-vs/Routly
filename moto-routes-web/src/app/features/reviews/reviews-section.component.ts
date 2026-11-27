import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { LOGIN_PATH } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { Review, ReviewTargetType } from './reviews.models';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { PhotoViewerComponent, ViewerPhoto } from './components/photo-viewer/photo-viewer.component';
import { ReviewFormComponent } from './components/review-form/review-form.component';
import { ReviewItemComponent } from './components/review-item/review-item.component';
import { ReviewsAiSummaryComponent } from './components/reviews-ai-summary/reviews-ai-summary.component';
import { ReviewsSummaryComponent } from './components/reviews-summary/reviews-summary.component';
import { REVIEW_SORTS, ReviewSort, ReviewsStore, parseReviewsQuery, reviewErrorMessage } from './reviews.store';

/**
 * La sección de opiniones, la misma para una experiencia y para un guía (targetType + slug):
 * la nota con su reparto, las fotos de los clientes, mi opinión (o el botón de escribirla), el
 * orden y los filtros (en la URL), la lista con "Ver más" y el formulario.
 *
 * Sin sesión, "Escribir una opinión" lleva a entrar y vuelve aquí. El anfitrión no puede opinar
 * sobre lo suyo: lo dice la API (canReview), así la web no cambia cuando cambie la regla.
 * Encima de la lista va el resumen IA (app-reviews-ai-summary), que también lee de este store.
 */
@Component({
  selector: 'app-reviews-section',
  imports: [
    ReviewsSummaryComponent,
    ReviewsAiSummaryComponent,
    ReviewItemComponent,
    ReviewFormComponent,
    PhotoViewerComponent,
    ConfirmDialogComponent,
    SkeletonComponent,
    IconComponent,
  ],
  providers: [ReviewsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reviews-section.component.html',
  styleUrl: './reviews-section.component.css',
})
export class ReviewsSectionComponent {
  readonly type = input.required<ReviewTargetType>();
  readonly slug = input.required<string>();
  /** El _id de la experiencia o del guía (POST /api/reviews lo pide) */
  readonly targetId = input.required<string>();
  /** Cómo se nombra en el formulario: "Calas de Mallorca", "Lucía" */
  readonly name = input.required<string>();
  /** Se ha escrito, editado o borrado una opinión: la nota guardada de la página ha cambiado */
  readonly changed = output<void>();

  protected readonly store = inject(ReviewsStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly viewer = viewChild.required<PhotoViewerComponent>('viewer');
  private readonly confirm = viewChild.required<ConfirmDialogComponent>('confirm');

  protected readonly sorts = (Object.keys(REVIEW_SORTS) as ReviewSort[]).map((value) => ({ value, label: REVIEW_SORTS[value].label }));
  protected readonly writing = signal(false);
  protected readonly removeError = signal<string | null>(null);
  protected readonly viewerPhotos = signal<ViewerPhoto[]>([]);
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map(parseReviewsQuery)), { requireSync: true });

  /** Sale el botón: sin sesión (lleva a entrar) o con sesión si la API dice que puedo */
  protected readonly canWrite = computed(() => {
    if (!this.auth.hasSession()) return true;
    const mine = this.store.mine();
    return mine !== null && mine.canReview;
  });
  protected readonly ownTarget = computed(() => this.store.mine()?.reason === 'OWN_TARGET');

  constructor() {
    effect(() => void this.store.load(this.type(), this.slug(), this.query()));
    // Mi opinión: cuando se sabe quién soy, y otra vez si entro o salgo
    effect(() => {
      const loggedIn = this.auth.isLoggedIn();
      this.slug();
      untracked(() => (loggedIn ? void this.store.loadMine() : this.store.forgetMine()));
    });
  }

  write(): void {
    if (!this.auth.hasSession()) {
      void this.router.navigate([LOGIN_PATH], { queryParams: { volver: this.router.url.split('#')[0] } });
      return;
    }
    this.removeError.set(null);
    this.writing.set(true);
  }

  protected setSort(event: Event): void {
    this.store.setSort((event.target as HTMLSelectElement).value as ReviewSort);
  }

  protected openStrip(index: number): void {
    this.viewerPhotos.set(this.store.photos());
    this.viewer().open(index);
  }

  protected openReview(review: Review, index: number): void {
    this.viewerPhotos.set(review.photos.map((photo) => ({ ...photo, author: review.user?.name })));
    this.viewer().open(index);
  }

  protected async onSaved(): Promise<void> {
    this.writing.set(false);
    await this.store.refresh();
    this.changed.emit();
  }

  protected async remove(review: Review): Promise<void> {
    if (!(await this.confirm().open())) return;
    this.removeError.set(null);
    try {
      await this.store.remove(review._id);
      this.changed.emit();
    } catch (error) {
      this.removeError.set(reviewErrorMessage(error, this.type()));
    }
  }
}
