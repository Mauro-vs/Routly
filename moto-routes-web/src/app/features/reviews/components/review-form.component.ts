import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';

import { ReviewsApiService } from '../../../core/reviews/reviews-api.service';
import { REVIEW_LIMITS, Review, ReviewTargetType } from '../../../core/reviews/reviews.models';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { STAR_POINTS } from '../../../shared/ui/stars/stars.component';
import { resizePhoto } from '../photo-resize';
import { photoErrorMessage, reviewErrorMessage } from '../review-errors';

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
  template: `
    <form (submit)="$event.preventDefault(); save()" novalidate [attr.aria-busy]="saving()">
      <fieldset class="stars">
        <legend>Tu nota <span class="req">(obligatoria)</span></legend>
        <div class="picker" (mouseleave)="hover.set(0)">
          @for (star of five; track star) {
            <label [class.on]="star <= (hover() || rating())" (mouseenter)="hover.set(star)">
              <input type="radio" name="rating" [value]="star" [checked]="rating() === star" (change)="rating.set(star)" [disabled]="saving()" />
              <svg viewBox="0 0 24 24" aria-hidden="true"><polygon [attr.points]="points" /></svg>
              <span class="sr-only">{{ star }} {{ star === 1 ? 'estrella' : 'estrellas' }}: {{ labels[star] }}</span>
            </label>
          }
          <span class="word" aria-hidden="true">{{ labels[hover() || rating()] }}</span>
        </div>
      </fieldset>

      <label class="field">
        Título <small>(opcional)</small>
        <input type="text" [value]="title()" (input)="title.set(value($event))" [attr.maxlength]="limits.titleMax" [disabled]="saving()" />
      </label>

      <label class="field">
        <span>Comentario @if (rule().required) {<span class="req">(obligatorio)</span>} @else {<small>(opcional)</small>}</span>
        @if (rule().required) {
          <small id="comentario-ayuda">Cuéntanos qué ha fallado para que otros riders y el guía puedan entenderlo.</small>
        }
        <textarea
          [value]="comment()"
          (input)="comment.set(value($event))"
          [attr.maxlength]="limits.commentMax"
          [attr.aria-invalid]="commentError() !== null"
          [attr.aria-describedby]="'comentario-contador' + (rule().required ? ' comentario-ayuda' : '')"
          [disabled]="saving()"
        ></textarea>
        <small id="comentario-contador" class="num" [class.field-error]="commentError() !== null" aria-live="polite">
          {{ commentLength() }} / {{ limits.commentMax }}@if (commentError(); as error) { · {{ error }}}
        </small>
      </label>

      <div class="photos">
        <p class="photos-title">Fotos <small>(hasta {{ limits.photosMax }})</small></p>
        <ul>
          @for (photo of keptPhotos(); track photo._id) {
            <li>
              <img [src]="photo.url" alt="Foto de tu opinión" />
              <button type="button" class="remove" (click)="removeExisting(photo._id)" [disabled]="saving()" aria-label="Quitar esta foto"><ui-icon name="x" /></button>
            </li>
          }
          @for (photo of newPhotos(); track photo.key; let i = $index) {
            <li [class.failed]="photo.state === 'error'">
              <img [src]="photo.preview" [alt]="'Foto nueva ' + (i + 1)" />
              @if (photo.state === 'resizing' || photo.state === 'uploading') {<span class="badge">{{ photo.state === 'resizing' ? 'Preparando…' : 'Subiendo…' }}</span>}
              @if (photo.state === 'done') {<span class="badge ok"><ui-icon name="check" /> Subida</span>}
              @if (photo.error; as error) {<span class="badge bad" role="alert">{{ error }}</span>}
              @if (photo.state !== 'done') {
                <button type="button" class="remove" (click)="removeNew(photo.key)" [disabled]="saving()" [attr.aria-label]="'Quitar la foto nueva ' + (i + 1)"><ui-icon name="x" /></button>
              }
            </li>
          }
        </ul>
        @if (slotsLeft() > 0) {
          <label class="btn-ghost add" [class.disabled]="saving()">
            <ui-icon name="camera" /> Añadir fotos
            <input type="file" class="sr-only" accept="image/jpeg,image/png,image/webp" multiple (change)="pick($event)" [disabled]="saving()" />
          </label>
        }
      </div>

      @if (error(); as error) {<p class="form-error" role="alert">{{ error }}</p>}
      @if (progress(); as progress) {<p class="progress" aria-live="polite">{{ progress }}</p>}

      <div class="buttons">
        <button type="button" class="btn-ghost" (click)="finish()" [disabled]="saving()">{{ photosFailed() ? 'Terminar sin esas fotos' : 'Cancelar' }}</button>
        <button type="submit" class="btn-primary" [disabled]="!canSubmit()">
          {{ saving() ? 'Guardando…' : photosFailed() ? 'Reintentar las fotos' : review() ? 'Guardar los cambios' : 'Publicar mi opinión' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    form {
      display: grid;
      gap: var(--space-5);
    }

    fieldset {
      margin: 0;
      padding: 0;
      border: 0;
    }

    legend,
    .photos-title {
      margin-bottom: var(--space-2);
      font-size: var(--text-sm);
      font-weight: 650;
    }

    .req {
      color: var(--color-danger);
      font-weight: 650;
    }

    .picker {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .picker label {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      cursor: pointer;
    }

    .picker svg {
      width: 34px;
      height: 34px;
      fill: var(--color-star-off);
      transition: fill var(--motion-fast) var(--motion-ease);
    }

    .picker label.on svg {
      fill: var(--color-star);
    }

    .picker input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .picker label:has(input:focus-visible) {
      outline: 2px solid var(--color-primary);
    }

    .word {
      margin-left: var(--space-2);
      font-weight: 700;
    }

    .photos ul {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      margin: 0 0 var(--space-3);
      padding: 0;
      list-style: none;
    }

    .photos li {
      position: relative;
      width: 104px;
    }

    .photos img {
      display: block;
      width: 104px;
      height: 104px;
      border-radius: var(--radius-md);
      object-fit: cover;
    }

    .failed img {
      outline: 2px solid var(--color-danger);
    }

    .remove {
      position: absolute;
      top: 4px;
      right: 4px;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: var(--radius-pill);
      background: rgb(12 36 25 / 0.85);
      color: #ffffff;
      cursor: pointer;
    }

    .badge {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      margin-top: var(--space-1);
      font-size: var(--text-xs);
      font-weight: 650;
      color: var(--color-text-muted);
    }

    .badge.ok {
      color: var(--color-success);
    }

    .badge.bad {
      color: var(--color-danger);
    }

    .add.disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    .progress {
      font-weight: 650;
    }

    .buttons {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-3);
    }
  `,
})
export class ReviewFormComponent implements OnInit {
  readonly type = input.required<ReviewTargetType>();
  readonly targetId = input.required<string>();
  /** La que se edita, o null para escribir una nueva */
  readonly review = input<Review | null>(null);
  /** Guardada del todo (el texto y las fotos): la sección cierra el formulario y recarga */
  readonly saved = output<Review>();
  readonly cancel = output<void>();

  private readonly api = inject(ReviewsApiService);
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
          ? await this.api.update(current._id, input)
          : await this.api.create(this.type(), this.targetId(), { ...input, title: input.title ?? undefined, comment: input.comment ?? undefined });
        this.savedReview = review;
      } catch (error) {
        this.error.set(reviewErrorMessage(error, this.type()));
        this.saving.set(false);
        return;
      }
    }

    for (const id of this.removed()) {
      try {
        review = await this.api.removePhoto(review._id, id);
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
        review = await this.api.uploadPhoto(review._id, photo.blob as Blob);
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
