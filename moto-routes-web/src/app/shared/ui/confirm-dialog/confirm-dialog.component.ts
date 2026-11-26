import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';

/**
 * Una confirmación propia (nada de confirm() del navegador): un <dialog> modal con su pregunta y
 * dos botones. open() devuelve una promesa: true si confirma; false si cancela o cierra con Esc.
 */
@Component({
  selector: 'ui-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="sheet" [attr.aria-labelledby]="id + '-title'" (close)="settle(dialog.returnValue === 'ok')">
      <form method="dialog">
        <h2 [id]="id + '-title'">{{ title() }}</h2>
        @if (message()) {<p>{{ message() }}</p>}
        <div class="buttons">
          <button type="submit" value="cancel" class="btn-ghost">Cancelar</button>
          <button type="submit" value="ok" class="btn-primary" [class.danger]="danger()">{{ confirmLabel() }}</button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    form {
      display: grid;
      gap: var(--space-4);
    }

    h2 {
      font-size: 20px;
      font-weight: 800;
    }

    p {
      color: var(--color-text-muted);
    }

    .buttons {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-3);
    }

    .danger::before {
      background: var(--color-danger);
    }

    .danger {
      color: #ffffff;
    }
  `,
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
