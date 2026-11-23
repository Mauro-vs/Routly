import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

/**
 * El mensaje para el cliente cuando no se puede entrar o registrarse. auth da el mismo 401 si el
 * correo no existe, la contraseña no coincide o la cuenta está desactivada: aquí tampoco se distingue.
 */
export function authErrorMessage(error: unknown, action: 'login' | 'register'): string {
  if (error instanceof TimeoutError) return 'Está tardando demasiado en responder. Vuelve a intentarlo.';
  if (!(error instanceof HttpErrorResponse)) return 'Algo ha fallado. Vuelve a intentarlo.';

  switch (error.status) {
    case 0:
      return 'No hemos podido conectar. Comprueba tu conexión y vuelve a intentarlo.';
    case 401:
      return 'El correo o la contraseña no son correctos.';
    case 409:
      return 'Ya hay una cuenta con ese correo. Prueba a entrar.';
    case 400:
      return action === 'register'
        ? 'Revisa los datos: el nombre, un correo válido y una contraseña de 8 caracteres con letras y números.'
        : 'Escribe tu correo y tu contraseña.';
    case 429:
      return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
    default:
      return 'Algo ha fallado de nuestro lado. Vuelve a intentarlo en unos minutos.';
  }
}
