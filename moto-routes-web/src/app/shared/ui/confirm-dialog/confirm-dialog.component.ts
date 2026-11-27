import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';

/**
 * Una confirmación propia (nada de confirm() del navegador): un <dialog> modal con su pregunta y
 * dos botones. open() devuelve una promesa: true si confirma; false si cancela o cierra con Esc.
 */
@Component({
  selector: 'ui-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css',
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly confirmLabel = input('Aceptar');
  readonly danger = input(false);

  protected readonly id = `confirm-${Math.random().toString(36).slice(2, 8)}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private resolve: ((value: boolean) => void) | null = null;

  open(): Promise<boolean> {
    const dialog = this.dialog().nativeElement;
    dialog.returnValue = '';
    dialog.showModal();
    return new Promise((resolve) => (this.resolve = resolve));
  }

  protected settle(confirmed: boolean): void {
    this.resolve?.(confirmed);
    this.resolve = null;
  }
}
