import { ChangeDetectionStrategy, Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';

import { IconComponent } from '../../../../shared/ui/icon/icon.component';

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
  templateUrl: './photo-viewer.component.html',
  styleUrl: './photo-viewer.component.css',
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
