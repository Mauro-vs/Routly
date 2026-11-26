import { ViewportScroller } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { isAbortError, toApiError } from '../../core/api/api-error';
import { ReviewsApiService } from '../../core/reviews/reviews-api.service';
import { MyReview, Review, ReviewPhoto, ReviewTargetType, ReviewsSummary } from '../../core/reviews/reviews.models';
import { navigateKeepingScroll } from '../../shared/utils/keep-scroll';
import { DEFAULT_REVIEWS_QUERY, ReviewsQuery, sameReviewsQuery, toReviewsApiParams, toReviewsUrl } from './reviews-query';

export type ReviewsStatus = 'loading' | 'ready' | 'error';

/** Una foto de la tira "Fotos de los clientes", con de quién es (para el visor). */
export interface CustomerPhoto extends ReviewPhoto {
  author: string;
}

/** Cuántas opiniones con fotos se piden para la tira */
const STRIP_LIMIT = 20;

/**
 * El estado de la sección de opiniones de una experiencia o un guía (lo provee la sección, así
 * cada página tiene el suyo).
 *
 *   - La lista: la primera página cada vez que cambia lo que se ve (orden, estrellas, con fotos,
 *     que vienen de la URL) y "Ver más" añade la siguiente. Un AbortController por petición: la
 *     respuesta de una búsqueda vieja nunca pisa la nueva.
 *   - El resumen (media, reparto por estrellas, cuántas con fotos) es de todas, no de la página.
 *   - La tira de fotos de los clientes y "la mía" (con sesión), aparte.
 */
@Injectable()
export class ReviewsStore {
  private readonly api = inject(ReviewsApiService);
  private readonly router = inject(Router);
  private readonly scroller = inject(ViewportScroller);

  private listController: AbortController | null = null;
  private stripController: AbortController | null = null;
  private mineController: AbortController | null = null;
  private target: { type: ReviewTargetType; slug: string } | null = null;

  readonly query = signal<ReviewsQuery>(DEFAULT_REVIEWS_QUERY);
  readonly status = signal<ReviewsStatus>('loading');
  readonly error = signal<string | null>(null);
  readonly reviews = signal<Review[]>([]);
  readonly summary = signal<ReviewsSummary | null>(null);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly totalPages = signal(0);
  readonly loadingMore = signal(false);
  readonly photos = signal<CustomerPhoto[]>([]);
  /** Mi opinión y si puedo opinar: null sin sesión (o mientras no se sabe) */
  readonly mine = signal<MyReview | null>(null);

  readonly hasMore = computed(() => this.page() < this.totalPages());
  /** La lista sin la mía, que se enseña aparte arriba */
  readonly others = computed(() => {
    const mineId = this.mine()?.review?._id;
    return mineId ? this.reviews().filter((review) => review._id !== mineId) : this.reviews();
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.listController?.abort();
      this.stripController?.abort();
      this.mineController?.abort();
    });
  }

  /** Otra experiencia o guía, o lo que se ve ha cambiado (la URL): la primera página. */
  async load(type: ReviewTargetType, slug: string, query: ReviewsQuery): Promise<void> {
    const changedTarget = this.target?.type !== type || this.target.slug !== slug;
    if (!changedTarget && sameReviewsQuery(query, this.query()) && this.status() !== 'error' && this.summary()) return;
    this.target = { type, slug };
    this.query.set(query);
    if (changedTarget) {
      this.summary.set(null);
      void this.loadPhotos();
    }
    await this.fetchPage(1);
  }

  /** "Ver más": la página siguiente, debajo de las que ya hay. */
  async loadMore(): Promise<void> {
    if (!this.hasMore() || this.loadingMore()) return;
    await this.fetchPage(this.page() + 1);
  }

  /** Después de escribir, editar o borrar: todo otra vez (la nota y la tira también cambian). */
  async refresh(): Promise<void> {
    if (!this.target) return;
    void this.loadPhotos();
    await Promise.all([this.fetchPage(1), this.loadMine()]);
  }

  /** Mi opinión, si hay sesión. Sin sesión (o si falla), null: se enseña el botón de opinar. */
  async loadMine(): Promise<void> {
    if (!this.target) return;
    this.mineController?.abort();
    const controller = new AbortController();
    this.mineController = controller;
    try {
      this.mine.set(await this.api.mine(this.target.type, this.target.slug, controller.signal));
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      this.mine.set(null);
    }
  }

  forgetMine(): void {
    this.mineController?.abort();
    this.mine.set(null);
  }

  // ---------- Lo que se ve, en la URL ----------

  setSort(sort: ReviewsQuery['sort']): void {
    this.navigate({ ...this.query(), sort });
  }

  /** Pulsar la barra de unas estrellas filtra por ellas; pulsarla otra vez quita el filtro. */
  toggleStars(stars: number): void {
    this.navigate({ ...this.query(), stars: this.query().stars === stars ? null : stars });
  }

  setWithPhotos(withPhotos: boolean): void {
    this.navigate({ ...this.query(), withPhotos });
  }

  clearFilters(): void {
    this.navigate({ ...this.query(), stars: null, withPhotos: false });
  }

  private navigate(query: ReviewsQuery): void {
    void navigateKeepingScroll(this.router, this.scroller, [], {
      queryParams: toReviewsUrl(query),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // ---------- Peticiones ----------

  private async fetchPage(page: number): Promise<void> {
    const target = this.target;
    if (!target) return;
    this.listController?.abort();
    const controller = new AbortController();
    this.listController = controller;
    if (page === 1) {
      this.status.set('loading');
      this.error.set(null);
    } else {
      this.loadingMore.set(true);
    }

    try {
      const result = await this.api.list(target.type, target.slug, toReviewsApiParams(this.query(), page), controller.signal);
      this.reviews.set(page === 1 ? result.data : [...this.reviews(), ...result.data]);
      this.summary.set(result.summary);
      this.total.set(result.pagination.total);
      this.page.set(result.pagination.page);
      this.totalPages.set(result.pagination.totalPages);
      this.status.set('ready');
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      this.error.set(toApiError(error).message);
      if (page === 1) {
        this.reviews.set([]);
        this.status.set('error');
      }
    } finally {
      if (this.listController === controller) this.loadingMore.set(false);
    }
  }

  private async loadPhotos(): Promise<void> {
    const target = this.target;
    if (!target) return;
    this.stripController?.abort();
    const controller = new AbortController();
    this.stripController = controller;
    try {
      const result = await this.api.list(
        target.type,
        target.slug,
        { withPhotos: true, sort: 'recent', limit: STRIP_LIMIT },
        controller.signal,
      );
      this.photos.set(
        result.data.flatMap((review) => review.photos.map((photo) => ({ ...photo, author: review.user?.name ?? 'Un rider' }))),
      );
    } catch {
      // La tira es un extra: si falla, no se enseña
      if (!controller.signal.aborted) this.photos.set([]);
    }
  }
}
