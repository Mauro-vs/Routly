import { ViewportScroller } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { ParamMap, Router } from '@angular/router';
import { TimeoutError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AiReviewsSummary } from '../../core/ai/ai.models';
import { toApiError } from '../../core/api/api-error';
import { AI_URL, ApiParams, ApiService, REVIEWS_URL, SHOP_URL } from '../../core/api/api.service';
import { navigateKeepingScroll } from '../../shared/utils/keep-scroll';
import { PhotoTooLargeError, UnreadablePhotoError } from './photo-resize';
import { MyReview, Review, ReviewInput, ReviewPhoto, ReviewTargetType, ReviewsPage, ReviewsSummary } from './reviews.models';

/*
 * Todo lo de las opiniones de la web en un archivo: el estado (ReviewsStore, abajo), las peticiones
 * a la API (las hace el store con ApiService: los componentes solo llaman al store), lo que va en
 * la URL y los mensajes de error en español.
 */

export type ReviewsStatus = 'loading' | 'ready' | 'error';

/** Una foto de la tira "Fotos de los clientes", con de quién es (para el visor). */
export interface CustomerPhoto extends ReviewPhoto {
  author: string;
}

/** Con menos opiniones (contando las que solo tienen estrellas) el resumen IA ni se pide: necesita 3 con comentario */
export const MIN_REVIEWS_FOR_SUMMARY = 3;

/** Cuántas opiniones con fotos se piden para la tira */
const STRIP_LIMIT = 20;

/** El tramo de /api/shop de cada tipo: /experiences/:slug o /hosts/:slug */
const SHOP_PATH: Record<ReviewTargetType, string> = { experience: '/experiences', host: '/hosts' };
const reviewsUrl = (type: ReviewTargetType, slug: string): string => `${SHOP_URL}${SHOP_PATH[type]}/${encodeURIComponent(slug)}/reviews`;

// ---------- Lo que se ve, en la URL ----------

/*
 * Lo que se ve de las opiniones va en la URL, en español, como el Shop:
 * ?opiniones=recientes|mejores|peores&estrellas=1..5&con-fotos=si&
 * Lo que no vale se ignora. "Ver más" no va en la URL: la página siguiente se añade a la lista.
 */

export const REVIEW_URL_PARAMS = { sort: 'opiniones', stars: 'estrellas', withPhotos: 'con-fotos' } as const;

export type ReviewSort = 'recientes' | 'mejores' | 'peores';

export const REVIEW_SORTS: Record<ReviewSort, { label: string; api: string }> = {
  recientes: { label: 'Más recientes', api: 'recent' },
  mejores: { label: 'Mejor valoradas', api: 'best' },
  peores: { label: 'Peor valoradas', api: 'worst' },
};

export interface ReviewsQuery {
  sort: ReviewSort;
  /** Solo las de esas estrellas, o null */
  stars: number | null;
  withPhotos: boolean;
}

export const DEFAULT_REVIEWS_QUERY: ReviewsQuery = { sort: 'recientes', stars: null, withPhotos: false };

/** Cuántas opiniones por página ("Ver más" pide las siguientes) */
export const REVIEWS_PAGE_SIZE = 10;

export function parseReviewsQuery(params: ParamMap): ReviewsQuery {
  const sort = params.get(REVIEW_URL_PARAMS.sort);
  const stars = Number(params.get(REVIEW_URL_PARAMS.stars));
  return {
    sort: sort !== null && sort in REVIEW_SORTS ? (sort as ReviewSort) : 'recientes',
    stars: Number.isInteger(stars) && stars >= 1 && stars <= 5 ? stars : null,
    withPhotos: params.get(REVIEW_URL_PARAMS.withPhotos) === 'si',
  };
}

/** La query de la URL, para escribirla: lo que está por defecto no se escribe. */
export function toReviewsUrl(query: ReviewsQuery): Record<string, string | null> {
  return {
    [REVIEW_URL_PARAMS.sort]: query.sort === 'recientes' ? null : query.sort,
    [REVIEW_URL_PARAMS.stars]: query.stars === null ? null : String(query.stars),
    [REVIEW_URL_PARAMS.withPhotos]: query.withPhotos ? 'si' : null,
  };
}

/** Los parámetros de /api/shop/.../reviews de una página. */
export function toReviewsApiParams(query: ReviewsQuery, page: number): ApiParams {
  return {
    sort: REVIEW_SORTS[query.sort].api,
    rating: query.stars,
    withPhotos: query.withPhotos ? true : null,
    page,
    limit: REVIEWS_PAGE_SIZE,
  };
}

export const sameReviewsQuery = (a: ReviewsQuery, b: ReviewsQuery): boolean =>
  a.sort === b.sort && a.stars === b.stars && a.withPhotos === b.withPhotos;

// ---------- Los errores, en español ----------

/** El code que manda la API con el error (REVIEW_ALREADY_EXISTS, OWN_TARGET...), si lo hay. */
export function errorCode(error: unknown): string | undefined {
  if (!(error instanceof HttpErrorResponse)) return undefined;
  const body: unknown = error.error;
  if (typeof body !== 'object' || body === null) return undefined;
  const code = (body as Record<string, unknown>)['code'];
  return typeof code === 'string' ? code : undefined;
}

const OWN: Record<ReviewTargetType, string> = {
  experience: 'No puedes opinar sobre tus propias experiencias.',
  host: 'No puedes opinar sobre ti mismo como guía.',
};
const ALREADY: Record<ReviewTargetType, string> = {
  experience: 'Ya has opinado sobre esta experiencia. Puedes editar tu opinión.',
  host: 'Ya has opinado sobre este guía. Puedes editar tu opinión.',
};

/** Por qué no se ha podido guardar la opinión, en español y con sentido. */
export function reviewErrorMessage(error: unknown, type: ReviewTargetType): string {
  if (error instanceof TimeoutError) return 'Está tardando demasiado en responder. Vuelve a intentarlo.';
  if (!(error instanceof HttpErrorResponse)) return 'Algo ha fallado. Vuelve a intentarlo.';

  switch (errorCode(error)) {
    case 'REVIEW_ALREADY_EXISTS':
      return ALREADY[type];
    case 'OWN_TARGET':
      return OWN[type];
    case 'COMMENT_REQUIRED_FOR_LOW_RATING':
      return 'Con 1 o 2 estrellas, cuéntanos qué ha fallado (30 caracteres como mínimo).';
  }

  switch (error.status) {
    case 0:
      return 'No hemos podido conectar. Comprueba tu conexión y vuelve a intentarlo.';
    case 400:
      return 'Revisa la opinión: las estrellas, el título (hasta 100 caracteres) y el comentario (de 10 a 2000).';
    case 401:
      return 'Tu sesión ha terminado. Entra otra vez para guardar tu opinión.';
    case 403:
      return 'Esta opinión no es tuya.';
    case 404:
      return 'Ya no se puede opinar aquí: puede que ya no esté disponible.';
    case 409:
      return ALREADY[type];
    case 429:
      return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
    default:
      return 'Algo ha fallado de nuestro lado. Vuelve a intentarlo en unos minutos.';
  }
}

/** Por qué no se ha podido subir una foto. */
export function photoErrorMessage(error: unknown): string {
  if (error instanceof PhotoTooLargeError) return 'La foto pesa demasiado incluso reducida. Prueba con otra.';
  if (error instanceof UnreadablePhotoError) return 'No hemos podido leer la foto. Usa una JPEG, PNG o WebP.';
  if (error instanceof TimeoutError) return 'La subida está tardando demasiado.';
  if (!(error instanceof HttpErrorResponse)) return 'No se ha podido subir.';

  switch (errorCode(error)) {
    case 'INVALID_IMAGE':
      return 'No es una foto válida (JPEG, PNG o WebP).';
    case 'PHOTO_TOO_LARGE':
      return 'La foto pesa demasiado.';
    case 'TOO_MANY_PHOTOS':
      return 'Ya tiene las 4 fotos que caben.';
  }
  if (error.status === 413) return 'La foto pesa demasiado.';
  if (error.status === 0) return 'No hemos podido conectar.';
  return 'No se ha podido subir.';
}

// ---------- El estado ----------

/**
 * El estado de la sección de opiniones de una experiencia o un guía (lo provee la sección, así
 * cada página tiene el suyo).
 *
 *   - La lista: la primera página cada vez que cambia lo que se ve (orden, estrellas, con fotos,
 *     que vienen de la URL) y "Ver más" añade la siguiente. Cada petición lleva su AbortController: la
 *     búsqueda vieja se aborta y nunca pisa a la nueva.
 *   - El resumen (media, reparto por estrellas, cuántas con fotos) es de todas, no de la página.
 *   - La tira de fotos de los clientes y "la mía" (con sesión), aparte.
 *   - Escribir, editar y borrar (la mía) y sus fotos: el formulario y la sección llaman aquí.
 */
@Injectable()
export class ReviewsStore {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly scroller = inject(ViewportScroller);

  // Uno por cada cosa que se pide: al pedirla otra vez (o salir de la página) se aborta la anterior
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
  /** El resumen IA: null si no hay (pocas opiniones, sin IA o si falla) */
  readonly aiSummary = signal<AiReviewsSummary | null>(null);
  readonly aiLoading = signal(false);
  /** De qué objetivo es el resumen pedido ("experience/calas-1"): se pide una vez por objetivo */
  private aiFor: string | null = null;

  readonly hasMore = computed(() => this.page() < this.totalPages());
  /** La lista sin la mía, que se enseña aparte arriba */
  readonly others = computed(() => {
    const mineId = this.mine()?.review?._id;
    return mineId ? this.reviews().filter((review) => review._id !== mineId) : this.reviews();
  });

  constructor() {
    // Al salir de la página, lo que llegue tarde ya no se pinta
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
      this.aiFor = null;
      this.aiSummary.set(null);
      this.aiLoading.set(false);
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
      const { data } = await this.api.get<{ data: MyReview }>(`${reviewsUrl(this.target.type, this.target.slug)}/mine`, {}, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) this.mine.set(data);
    } catch {
      if (!controller.signal.aborted) this.mine.set(null);
    }
  }

  forgetMine(): void {
    this.mineController?.abort();
    this.mine.set(null);
  }

  /**
   * El resumen IA (lo pide su componente cuando llega la nota). Una vez por experiencia o guía, y
   * solo con 3 opiniones o más. Es un extra: si no hay IA (503) o falla, no sale nada.
   */
  async loadAiSummary(): Promise<void> {
    const target = this.target;
    if (!target || (this.summary()?.count ?? 0) < MIN_REVIEWS_FOR_SUMMARY) return;
    const key = `${target.type}/${target.slug}`;
    if (this.aiFor === key) return;
    this.aiFor = key;
    this.aiLoading.set(true);
    try {
      const base = target.type === 'host' ? 'hosts' : 'experiences';
      const url = `${AI_URL}/${base}/${encodeURIComponent(target.slug)}/reviews-summary`;
      const { data } = await this.api.get<{ data: AiReviewsSummary | null }>(url, {}, { timeoutMs: environment.aiTimeout });
      if (this.aiFor === key) this.aiSummary.set(data);
    } catch {
      if (this.aiFor === key) this.aiSummary.set(null);
    } finally {
      if (this.aiFor === key) this.aiLoading.set(false);
    }
  }

  // ---------- Escribir (con sesión: el authInterceptor manda las cookies) ----------
  // Los errores se dejan tal cual (HttpErrorResponse): quien llama los traduce con
  // reviewErrorMessage o photoErrorMessage, según su status y su code

  create(type: ReviewTargetType, targetId: string, input: ReviewInput): Promise<Review> {
    return this.api.post<Review>(REVIEWS_URL, { targetType: type, targetId, ...input });
  }

  update(id: string, input: ReviewInput): Promise<Review> {
    return this.api.patch<Review>(`${REVIEWS_URL}/${id}`, input);
  }

  /** Borra la mía (a la papelera) y vuelve a cargar todo: la nota y la tira también cambian. */
  async remove(id: string): Promise<void> {
    await this.api.patch<null>(`${REVIEWS_URL}/${id}/delete`, {});
    await this.refresh();
  }

  /** Una foto ya reducida (photo-resize.ts), en el campo photo. Devuelve la opinión con sus fotos. */
  uploadPhoto(id: string, photo: Blob): Promise<Review> {
    const form = new FormData();
    form.append('photo', photo, `foto.${photo.type === 'image/webp' ? 'webp' : 'jpg'}`);
    return this.api.post<Review>(`${REVIEWS_URL}/${id}/photos`, form);
  }

  removePhoto(id: string, photoId: string): Promise<Review> {
    return this.api.delete<Review>(`${REVIEWS_URL}/${id}/photos/${photoId}`);
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
      const result = await this.api.get<ReviewsPage>(reviewsUrl(target.type, target.slug), toReviewsApiParams(this.query(), page), {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      this.reviews.set(page === 1 ? result.data : [...this.reviews(), ...result.data]);
      this.summary.set(result.summary);
      this.total.set(result.pagination.total);
      this.page.set(result.pagination.page);
      this.totalPages.set(result.pagination.totalPages);
      this.status.set('ready');
    } catch (error) {
      if (controller.signal.aborted) return;
      this.error.set(toApiError(error).message);
      if (page === 1) {
        this.reviews.set([]);
        this.status.set('error');
      }
    } finally {
      if (!controller.signal.aborted) this.loadingMore.set(false);
    }
  }

  private async loadPhotos(): Promise<void> {
    const target = this.target;
    if (!target) return;
    this.stripController?.abort();
    const controller = new AbortController();
    this.stripController = controller;
    try {
      const result = await this.api.get<ReviewsPage>(reviewsUrl(target.type, target.slug), {
        withPhotos: true,
        sort: 'recent',
        limit: STRIP_LIMIT,
      }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      this.photos.set(
        result.data.flatMap((review) => review.photos.map((photo) => ({ ...photo, author: review.user?.name ?? 'Un rider' }))),
      );
    } catch {
      // La tira es un extra: si falla, no se enseña
      if (!controller.signal.aborted) this.photos.set([]);
    }
  }
}
