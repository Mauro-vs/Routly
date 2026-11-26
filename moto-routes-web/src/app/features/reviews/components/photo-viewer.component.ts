import { ChangeDetectionStrategy, Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';

import { IconComponent } from '../../../shared/ui/icon/icon.component';

export interface ViewerPhoto {
  _id: string;
  url: string;
  width: number | null;
  height: number | null;
  /** De quién es, si se sabe */
  author?: string;
}

/**
 * El visor de fotos a pantalla completa: un <dialog> modal (el foco queda dentro y Esc lo cierra,
 * como cualquier diálogo del navegador), con anterior y siguiente en botones y con las flechas.
 */
@Component({
  selector: 'app-photo-viewer',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog aria-label="Fotos de los clientes" (keydown)="onKey($event)" (close)="index.set(-1)" (click)="onBackdrop($event)">
      @if (current(); as photo) {
        <figure>
          <img [src]="photo.url" [attr.width]="photo.width" [attr.height]="photo.height" alt="Foto de un cliente" />
          <figcaption>
            <span class="num">{{ index() + 1 }} de {{ photos().length }}</span>
            @if (photo.author) {<span>de {{ photo.author }}</span>}
          </figcaption>
        </figure>
        @if (photos().length > 1) {
          <button type="button" class="nav prev" (click)="step(-1)" aria-label="Foto anterior"><ui-icon name="caret-left" /></button>
          <button type="button" class="nav next" (click)="step(1)" aria-label="Foto siguiente"><ui-icon name="caret-right" /></button>
        }
      }
      <button type="button" class="close" (click)="close()" aria-label="Cerrar"><ui-icon name="x" /></button>
    </dialog>
  `,
  styles: `
    dialog {
      width: min(96vw, 1200px);
      max-width: none;
      max-height: 94vh;
      padding: 0;
      border: 0;
      background: transparent;
      color: #ffffff;
      overflow: visible;
    }

    dialog::backdrop {
      background: rgb(5 12 9 / 0.88);
    }

    figure {
      display: grid;
      justify-items: center;
      gap: var(--space-2);
      margin: 0;
    }

    img {
      max-width: 100%;
      max-height: 84vh;
      width: auto;
      height: auto;
      border-radius: var(--radius-lg);
      object-fit: contain;
    }

    figcaption {
      display: flex;
      gap: var(--space-3);
      font-size: var(--text-sm);
      color: rgb(255 255 255 / 0.8);
    }

    button {
      position: absolute;
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border: 0;
      border-radius: var(--radius-pill);
      background: rgb(12 36 25 / 0.85);
      color: #ffffff;
      font-size: 22px;
      cursor: pointer;
    }

    button:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    .close {
      top: 0;
      right: 0;
    }

    .nav {
      top: calc(50% - 24px);
    }

    .prev {
      left: var(--space-2);
    }

    .next {
      right: var(--space-2);
    }
  `,
})
export class PhotoViewerComponent {
  readonly photos = input.required<ViewerPhoto[]>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly index = signal(-1);
  protected readonly current = computed(() => this.photos()[this.index()] ?? null);

  open(index: number): void {
    this.index.set(index);
    const dialog = this.dialog().nativeElement;
    if (!dialog.open) dialog.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  protected step(delta: number): void {
    const count = this.photos().length;
    this.index.set((this.index() + delta + count) % count);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') this.step(-1);
    else if (event.key === 'ArrowRight') this.step(1);
  }

  // Pulsar fuera de la foto (en el fondo del diálogo) también cierra
  protected onBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }
}
