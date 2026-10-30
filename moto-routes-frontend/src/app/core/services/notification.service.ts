import { Injectable, inject } from '@angular/core';
import type Swal from 'sweetalert2';
import type { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

import { SessionResetService } from './session-reset.service';

interface ConfirmOptions {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  /** Acción destructiva: botón rojo y el foco empieza en "Cancelar". */
  danger?: boolean;
}

const ICON_COLORS: Record<SweetAlertIcon, string> = {
  success: 'var(--color-success)',
  error: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  info: 'var(--color-primary)',
  question: 'var(--color-primary)',
};

const TOAST_TIME = 3600;
const UNDO_TIME = 7000;

/**
 * Avisos y confirmaciones del panel. Envuelve SweetAlert2: ningún componente lo
 * importa directamente, así el aspecto y el comportamiento se deciden aquí.
 *
 * Los textos se pasan siempre como texto plano (`titleText` y `text`), nunca como
 * HTML, porque suelen llevar datos escritos por usuarios.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  // SweetAlert2 se descarga la primera vez que hace falta, no con el arranque.
  private library: Promise<typeof Swal> | null = null;
  private swal: typeof Swal | null = null;

  constructor() {
    // Al cerrar sesión no puede quedar abierto nada que actúe con ella, como "Deshacer".
    inject(SessionResetService).register(() => this.swal?.close());
  }

  /** Aviso breve de que algo ha salido bien. */
  success(message: string): Promise<void> {
    return this.toast('success', message);
  }

  warning(message: string): Promise<void> {
    return this.toast('warning', message);
  }

  /** Aviso breve de un fallo que no impide seguir trabajando. */
  errorToast(message: string): Promise<void> {
    return this.toast('error', message);
  }

  /** Diálogo de error que el usuario tiene que cerrar. Para fallos globales. */
  async error(message: string, title = 'Algo ha fallado'): Promise<void> {
    const swal = await this.load();
    await swal.fire({
      ...this.modalOptions('error'),
      titleText: title,
      text: message,
      confirmButtonText: 'Entendido',
    });
  }

  /** Pide confirmación. Devuelve true solo si el usuario acepta. */
  async confirm(options: ConfirmOptions): Promise<boolean> {
    const swal = await this.load();
    const base = this.modalOptions(options.danger ? 'warning' : 'question');
    const result = await swal.fire({
      ...base,
      titleText: options.title,
      text: options.text,
      showCancelButton: true,
      reverseButtons: true,
      focusCancel: options.danger ?? false,
      confirmButtonText: options.confirmText ?? 'Aceptar',
      cancelButtonText: options.cancelText ?? 'Cancelar',
      customClass: {
        ...base.customClass,
        confirmButton: options.danger ? 'btn btn--danger' : 'btn btn--primary',
      },
    });
    return result.isConfirmed;
  }

  /**
   * Aviso con un botón para deshacer la acción que se acaba de hacer.
   * Devuelve true si el usuario lo pulsa antes de que desaparezca.
   */
  async undoable(message: string, actionText = 'Deshacer'): Promise<boolean> {
    const swal = await this.load();
    const result = await swal.fire({
      ...this.toastOptions('success', swal),
      titleText: message,
      timer: UNDO_TIME,
      showConfirmButton: true,
      confirmButtonText: actionText,
      customClass: { confirmButton: 'btn btn--secondary btn--sm' },
    });
    return result.isConfirmed;
  }

  private async toast(icon: SweetAlertIcon, message: string): Promise<void> {
    const swal = await this.load();
    await swal.fire({ ...this.toastOptions(icon, swal), titleText: message });
  }

  private modalOptions(icon: SweetAlertIcon): SweetAlertOptions & {
    customClass: Record<string, string>;
  } {
    return {
      icon,
      iconColor: ICON_COLORS[icon],
      buttonsStyling: false,
      customClass: {
        confirmButton: 'btn btn--primary',
        cancelButton: 'btn btn--secondary',
      },
    };
  }

  private toastOptions(icon: SweetAlertIcon, swal: typeof Swal): SweetAlertOptions {
    return {
      toast: true,
      position: 'bottom-end',
      icon,
      iconColor: ICON_COLORS[icon],
      buttonsStyling: false,
      showConfirmButton: false,
      timer: TOAST_TIME,
      // El aviso no se va mientras el puntero esté encima.
      didOpen: (popup) => {
        popup.addEventListener('mouseenter', () => swal.stopTimer());
        popup.addEventListener('mouseleave', () => swal.resumeTimer());
      },
    };
  }

  private load(): Promise<typeof Swal> {
    this.library ??= import('sweetalert2/dist/sweetalert2.esm.all.js').then((module) => {
      this.swal = module.default;
      return module.default;
    });
    return this.library;
  }
}
