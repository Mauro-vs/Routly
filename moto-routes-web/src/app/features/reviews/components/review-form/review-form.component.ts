import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';

import { REVIEW_LIMITS, Review, ReviewTargetType } from '../../reviews.models';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { STAR_POINTS } from '../../../../shared/ui/stars/stars.component';
import { resizePhoto } from '../../photo-resize';
import { ReviewsStore, photoErrorMessage, reviewErrorMessage } from '../../reviews.store';

export const STAR_LABELS = ['', 'Muy mala', 'Mala', 'Normal', 'Buena', 'Excelente'];

/** Una foto nueva: se reduce al elegirla y se sube al guardar. */
interface NewPhoto {
  key: number;
  preview: string;
  blob: Blob | null;
  state: 'resizing' | 'ready' | 'uploading' | 'done' | 'error';
  error: string | null;
}

/** Lo que dice el comentario según las estrellas. */
export function commentRule(rating: number): { required: boolean; min: number } {
  const required = rating > 0 && rating <= REVIEW_LIMITS.lowRatingMax;
  return { required, min: required ? REVIEW_LIMITS.lowRatingCommentMin : REVIEW_LIMITS.commentMin };
}

let nextKey = 0;

/**
 * Escribir o editar mi opinión: las estrellas (radios, se eligen con las flechas), el título, el
 * comentario con su contador y hasta 4 fotos.
 *
 * Con 3 a 5 estrellas el comentario es opcional; con 1 o 2 pasa a obligatorio al momento, de 30
 * caracteres como mínimo, y no se puede enviar hasta cumplirlo (la API lo vuelve a comprobar).
 *
 * Al guardar: primero el texto (crear o editar), luego se quitan las fotos marcadas y se suben las
 * nuevas de una en una, con su progreso. Si una falla se dice cuál y se puede reintentar: el texto
 * ya está guardado y no se vuelve a enviar.
 */
@Component({
  selector: 'app-review-form',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-form.component.html',
  styleUrl: './review-form.component.css',
})
export class ReviewFormComponent implements OnInit {
  readonly type = input.required<ReviewTargetType>();
  readonly targetId = input.required<string>();
  /** La que se edita, o null para escribir una nueva */
  readonly review = input<Review | null>(null);
  /** Guardada del todo (el texto y las fotos): la sección cierra el formulario y recarga */
  readonly saved = output<Review>();
  readonly cancel = output<void>();

  /** El de la sección de opiniones: guarda el texto y sube las fotos */
  private readonly store = inject(ReviewsStore);
  protected readonly limits = REVIEW_LIMITS;
  protected readonly labels = STAR_LABELS;
  protected readonly five = [1, 2, 3, 4, 5];
  protected readonly points = STAR_POINTS;

  readonly rating = signal(0);
  protected readonly hover = signal(0);
  readonly title = signal('');
  readonly comment = signal('');
  readonly newPhotos = signal<NewPhoto[]>([]);
  private readonly removed = signal<string[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  protected readonly progress = signal<string | null>(null);
  /** El texto ya guardado en este formulario: si fallan las fotos, al reintentar no se repite */
  private savedReview: Review | null = null;

  readonly rule = computed(() => commentRule(this.rating()));
  protected readonly commentLength = computed(() => this.comment().trim().length);
  /** Lo que le falta al comentario, o null si vale */
  readonly commentError = computed(() => {
    const length = this.commentLength();
    const { required, min } = this.rule();
    if (required && length < min) return `con 1 o 2 estrellas, ${min} caracteres como mínimo`;
    if (!required && length > 0 && length < min) return `${min} caracteres como mínimo, o déjalo vacío`;
    return null;
  });
  protected readonly keptPhotos = computed(() => (this.review()?.photos ?? []).filter((photo) => !this.removed().includes(photo._id)));
  protected readonly slotsLeft = computed(
    () => REVIEW_LIMITS.photosMax - this.keptPhotos().length - this.newPhotos().filter((photo) => photo.state !== 'done').length,
  );
  readonly photosFailed = computed(() => this.newPhotos().some((photo) => photo.state === 'error' && photo.blob !== null));
  readonly canSubmit = computed(
    () =>
      !this.saving() &&
      this.rating() > 0 &&
      this.commentError() === null &&
      this.title().length <= REVIEW_LIMITS.titleMax &&
      !this.newPhotos().some((photo) => photo.state === 'resizing'),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.newPhotos().forEach((photo) => URL.revokeObjectURL(photo.preview)));
  }

  // Al editar, el formulario empieza con lo que había
  ngOnInit(): void {
    const review = this.review();
    if (!review) return;
    this.rating.set(review.rating);
    this.title.set(review.title ?? '');
    this.comment.set(review.comment ?? '');
  }

  /** Cancelar; o, si el texto ya se guardó y fallaron fotos, terminar sin ellas. */
  protected finish(): void {
    if (this.savedReview) this.saved.emit(this.savedReview);
    else this.cancel.emit();
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  /** Las fotos elegidas: se reducen ya (así la vista previa es la que se subirá). */
  async pick(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = [...(input.files ?? [])].slice(0, Math.max(0, this.slotsLeft()));
    input.value = '';
    await Promise.all(files.map((file) => this.addPhoto(file)));
  }

  async addPhoto(file: Blob): Promise<void> {
    const key = nextKey++;
    this.newPhotos.update((photos) => [...photos, { key, preview: URL.createObjectURL(file), blob: null, state: 'resizing', error: null }]);
    try {
      const blob = await resizePhoto(file);
      this.patchPhoto(key, { blob, state: 'ready' });
    } catch (error) {
      this.patchPhoto(key, { state: 'error', error: photoErrorMessage(error) });
    }
  }

  protected removeNew(key: number): void {
    const photo = this.newPhotos().find((item) => item.key === key);
    if (photo) URL.revokeObjectURL(photo.preview);
    this.newPhotos.update((photos) => photos.filter((item) => item.key !== key));
  }

  protected removeExisting(id: string): void {
    this.removed.update((ids) => [...ids, id]);
  }

  async save(): Promise<void> {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.error.set(null);

    let review = this.savedReview;
    if (!review) {
      try {
        const input = { rating: this.rating(), title: this.title().trim() || null, comment: this.comment().trim() || null };
        const current = this.review();
        review = current
          ? await this.store.update(current._id, input)
          : await this.store.create(this.type(), this.targetId(), { ...input, title: input.title ?? undefined, comment: input.comment ?? undefined });
        this.savedReview = review;
      } catch (error) {
        this.error.set(reviewErrorMessage(error, this.type()));
        this.saving.set(false);
        return;
      }
    }

    for (const id of this.removed()) {
      try {
        review = await this.store.removePhoto(review._id, id);
      } catch {
        // Ya no estaba: no pasa nada
      }
    }
    this.removed.set([]);

    const pending = this.newPhotos().filter((photo) => photo.blob && (photo.state === 'ready' || photo.state === 'error'));
    for (const [index, photo] of pending.entries()) {
      this.progress.set(`Subiendo la foto ${index + 1} de ${pending.length}…`);
      this.patchPhoto(photo.key, { state: 'uploading', error: null });
      try {
        review = await this.store.uploadPhoto(review._id, photo.blob as Blob);
        this.patchPhoto(photo.key, { state: 'done' });
      } catch (error) {
        this.patchPhoto(photo.key, { state: 'error', error: photoErrorMessage(error) });
      }
    }
    this.progress.set(null);
    this.saving.set(false);

    if (this.photosFailed()) {
      this.error.set('Tu opinión está guardada, pero alguna foto no se ha podido subir. Puedes reintentarlo.');
      return;
    }
    this.saved.emit(review);
  }

  private patchPhoto(key: number, patch: Partial<NewPhoto>): void {
    this.newPhotos.update((photos) => photos.map((photo) => (photo.key === key ? { ...photo, ...patch } : photo)));
  }
}
