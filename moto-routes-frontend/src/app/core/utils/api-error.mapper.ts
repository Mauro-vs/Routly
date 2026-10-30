import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

import { ApiError, FieldErrors } from '../models/api-error.model';

const MESSAGES = {
  network:
    'No hay conexión con la API. Comprueba que el servidor está en marcha y vuelve a intentarlo.',
  timeout: 'La API ha tardado demasiado en responder. Vuelve a intentarlo.',
  server: 'La API ha fallado al procesar la petición. Vuelve a intentarlo en unos minutos.',
  validationFields: 'Hay campos con errores. Revísalos y vuelve a guardar.',
  validation: 'La API ha rechazado los datos enviados.',
  noChanges: 'No has cambiado ningún dato: no hay nada que guardar.',
  invalidResponse: 'La API ha enviado una respuesta que el panel no entiende. Vuelve a intentarlo.',
  unauthorized: 'Necesitas iniciar sesión para hacer esto.',
  badCredentials: 'El correo o la contraseña no son correctos.',
  sessionExpired: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
  sessionRejected: 'Tu sesión ya no es válida. Inicia sesión de nuevo.',
  tooManyAttempts: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
  forbidden: 'No tienes permiso para hacer esto.',
  notFound: 'No se ha encontrado lo que buscabas. Puede que se haya eliminado.',
  // Un 409 que no se reconoce: no todos son duplicados (dependientes, roles base...)
  conflict: 'La API no ha permitido la operación.',
  tooLarge: 'Los datos enviados son demasiado grandes.',
  client: 'La API no ha aceptado la petición.',
  unknown: 'Ha ocurrido un error inesperado. Vuelve a intentarlo.',
} as const;

const CLIENT_MESSAGES: Record<number, string> = {
  401: MESSAGES.unauthorized,
  403: MESSAGES.forbidden,
  404: MESSAGES.notFound,
  409: MESSAGES.conflict,
  413: MESSAGES.tooLarge,
  429: MESSAGES.tooManyAttempts,
};

/** La API ha respondido bien, pero lo que ha llegado no tiene la forma esperada. */
export function invalidResponseError(): ApiError {
  return new ApiError({ status: 0, type: 'server', message: MESSAGES.invalidResponse });
}

/** El token ya ha caducado en el panel: la petición ni siquiera llega a salir. */
export function tokenExpiredError(): ApiError {
  return new ApiError({
    status: 401,
    type: 'client',
    message: MESSAGES.sessionExpired,
    code: 'TOKEN_EXPIRED',
  });
}

/**
 * Convierte cualquier fallo de una petición en un ApiError.
 * La API responde `{ statusCode, error, message, details?: [{ field, message }] }` y, si
 * rechaza el token, también `code`.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof TimeoutError) {
    return new ApiError({ status: 0, type: 'timeout', message: MESSAGES.timeout });
  }

  if (!(error instanceof HttpErrorResponse)) {
    return new ApiError({ status: 0, type: 'client', message: MESSAGES.unknown });
  }

  const { status } = error;
  const detail = readServerMessage(error.error);

  if (status === 0) {
    return new ApiError({ status, type: 'network', message: MESSAGES.network });
  }

  // Un 200 con un cuerpo que no es JSON también llega aquí como error de HttpClient.
  if (status < 400) {
    return invalidResponseError();
  }

  if (status >= 500) {
    return new ApiError({ status, type: 'server', message: MESSAGES.server, detail });
  }

  if (status === 400 || status === 422) {
    const fieldErrors = readFieldErrors(error.error);
    // Un PATCH sin ningún campo (la API lo rechaza con 400 y sin `details`).
    const noChanges = detail === 'No fields to update';
    return new ApiError({
      status,
      type: 'validation',
      message: fieldErrors
        ? MESSAGES.validationFields
        : noChanges
          ? MESSAGES.noChanges
          : MESSAGES.validation,
      fieldErrors,
      detail,
    });
  }

  if (status === 401) {
    const code = readCode(error.error);
    return new ApiError({
      status,
      type: 'client',
      message: unauthorizedMessage(detail, code),
      detail,
      code,
    });
  }

  return new ApiError({
    status,
    type: 'client',
    message: (status === 409 && translateConflict(detail)) || CLIENT_MESSAGES[status] || MESSAGES.client,
    detail,
  });
}

function unauthorizedMessage(detail: string | undefined, code: string | undefined): string {
  if (detail === 'Invalid email or password') return MESSAGES.badCredentials;
  if (code === 'TOKEN_EXPIRED') return MESSAGES.sessionExpired;
  return code ? MESSAGES.sessionRejected : MESSAGES.unauthorized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readServerMessage(body: unknown): string | undefined {
  return isRecord(body) && typeof body['message'] === 'string' ? body['message'] : undefined;
}

function readCode(body: unknown): string | undefined {
  return isRecord(body) && typeof body['code'] === 'string' ? body['code'] : undefined;
}

function readFieldErrors(body: unknown): FieldErrors | undefined {
  if (!isRecord(body) || !Array.isArray(body['details'])) return undefined;

  const fieldErrors: FieldErrors = {};
  for (const item of body['details'] as unknown[]) {
    if (!isRecord(item)) continue;
    const { field, message } = item;
    // Si un campo trae varios errores se muestra el primero.
    if (typeof field !== 'string' || typeof message !== 'string' || field in fieldErrors) continue;
    fieldErrors[field] = translateFieldMessage(field, message);
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

/** Cómo se nombra en español cada recurso de la API en los mensajes. */
const RESOURCES: Record<string, { a: string; own: string; active: string }> = {
  role: { a: 'un rol', own: 'su rol', active: 'activo' },
  user: { a: 'un usuario', own: 'su usuario', active: 'activo' },
  host: { a: 'un anfitrión', own: 'su anfitrión', active: 'activo' },
  category: { a: 'una categoría', own: 'su categoría', active: 'activa' },
  location: { a: 'una ubicación', own: 'una de sus ubicaciones', active: 'activa' },
  route: { a: 'una ruta', own: 'su ruta', active: 'activa' },
  experience: { a: 'una experiencia', own: 'su experiencia', active: 'activa' },
  departure: { a: 'una salida', own: 'su salida', active: 'activa' },
  bike: { a: 'una moto', own: 'su moto', active: 'activa' },
};

/** Lo que impide eliminar un registro ("Cannot delete a route that has experiences"). */
const DEPENDENTS: Record<string, string> = {
  users: 'usuarios',
  'a host profile': 'perfil de anfitrión',
  experiences: 'experiencias',
  routes: 'rutas',
  departures: 'salidas',
};

const DELETE_ACTIONS: Record<string, string> = {
  deactivated: 'desactivar',
  deleted: 'eliminar',
  renamed: 'renombrar',
};

/** Los 409 de la API no siempre son duplicados: cada motivo tiene su texto. */
const DUPLICATED_FIELDS: Record<string, string> = {
  name: 'ese nombre',
  label: 'ese nombre visible',
  email: 'ese email',
  slug: 'esa dirección',
  'city, region and country': 'esa ciudad, región y país',
};

const CONFLICT_RULES: ReadonlyArray<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/ is not deleted$/, () => 'Ese registro ya estaba restaurado.'],
  [
    /^An? (\w+) with this (.+) already exists( in the trash)?$/,
    (m) =>
      `Ya existe ${RESOURCES[m[1]]?.a ?? 'un registro'} con ${DUPLICATED_FIELDS[m[2]] ?? 'esos datos'}` +
      (m[3] ? ' en la papelera: se puede restaurar desde allí.' : '.'),
  ],
  [
    /^Cannot update: \w+ references a deleted (\w+)$/,
    (m) => `No se puede editar mientras ${RESOURCES[m[1]]?.own ?? 'una de sus referencias'} siga en la papelera.`,
  ],
  [
    /^Cannot restore: \w+ references a deleted (\w+)$/,
    (m) => `No se puede restaurar mientras ${RESOURCES[m[1]]?.own ?? 'una de sus referencias'} siga en la papelera.`,
  ],
  [/^Cannot delete a location that is used by routes$/, () => 'No se puede eliminar: la usan algunas rutas.'],
  [
    /^Cannot delete an? \w+ that has (.+)$/,
    (m) => `No se puede eliminar: tiene ${DEPENDENTS[m[1]] ?? 'registros que dependen de él'}.`,
  ],
  [
    /^System roles cannot be (\w+)$/,
    (m) => `Los roles base no se pueden ${DELETE_ACTIONS[m[1]] ?? 'modificar así'}.`,
  ],
  [/^User has a host profile$/, () => 'Tiene perfil de anfitrión: necesita conservar el rol de anfitrión.'],
  [
    /^This user already has a host profile( in the trash)?$/,
    (m) =>
      m[1]
        ? 'Ese usuario ya tiene un perfil de anfitrión en la papelera: se puede restaurar desde allí.'
        : 'Ese usuario ya tiene perfil de anfitrión.',
  ],
  [/^maxParticipants is lower than/, () => 'Hay salidas con más plazas que ese máximo.'],
  [/^minParticipants is higher than/, () => 'Hay salidas con menos plazas que ese mínimo.'],
  [/^Inactive images cannot be the cover$/, () => 'Una imagen inactiva no puede ser la principal.'],
  [/^You cannot change your own role$/, () => 'No puedes cambiar tu propio rol.'],
  [/^You cannot deactivate your own account$/, () => 'No puedes desactivar tu propia cuenta.'],
  [/^You cannot delete your own account$/, () => 'No puedes eliminar tu propia cuenta.'],
  [/^There must be at least one active admin$/, () => 'Tiene que quedar al menos un administrador activo.'],
  [
    /^Bike is the guide bike of an active experience or an upcoming departure$/,
    () => 'Esta moto guía una experiencia activa o una salida próxima. Cámbiala allí primero.',
  ],
  [/^A user can have at most (\d+) bikes$/, (m) => `Cada usuario puede tener ${m[1]} motos como mucho.`],
  [/references a user without the host role$/, () => 'No se puede restaurar: su usuario ya no tiene el rol de anfitrión.'],
];

function translateConflict(message: string | undefined): string | undefined {
  if (!message) return undefined;
  for (const [pattern, translate] of CONFLICT_RULES) {
    const match = message.match(pattern);
    if (match) return translate(match);
  }
  return undefined;
}

/** Reglas que escribe el errorHandler de la API, en el orden en que se comprueban. */
const FIELD_RULES: ReadonlyArray<[RegExp, (match: RegExpMatchArray) => string]> = [
  // Referencias a otra colección
  [
    /^must reference an active (\w+)$/,
    (m) => (RESOURCES[m[1]] ? `Elige ${RESOURCES[m[1]].a} ${RESOURCES[m[1]].active}.` : 'Elige una opción activa.'),
  ],
  [/^must reference an existing \w+$/, () => 'El elemento al que pertenece ya no existe.'],
  [/^must reference a user with the host role$/, () => 'El usuario tiene que tener el rol de anfitrión.'],
  [/^must reference an active, public bike of the host$/, () => 'Elige una moto activa y pública del anfitrión.'],
  [/^is incorrect$/, () => 'La contraseña actual no es correcta.'],
  [/^must be at least (\d+) years ago$/, (m) => `Hay que tener al menos ${m[1]} años.`],
  [/^must be after 1900-01-01$/, () => 'La fecha no es válida.'],
  [/^cannot be in the future$/, () => 'No puede ser una fecha futura.'],
  [/^cannot be later than (.+)$/, (m) => `No puede ser posterior a ${m[1]}.`],
  // Un campo que no se puede editar (el SKU de una salida, el usuario de un anfitrión...)
  [/^cannot be changed$/, () => 'Este dato no se puede cambiar.'],
  // Reglas entre campos (van antes que las genéricas de mínimo y máximo)
  [/^must be greater than or equal to minParticipants$/, () => 'No puede ser menor que el mínimo de participantes.'],
  [
    /^must be less than or equal to the experience maxParticipants$/,
    () => 'No puede superar el máximo de participantes de la experiencia.',
  ],
  [
    /^must be greater than or equal to the experience minParticipants$/,
    () => 'No puede ser menor que el mínimo de participantes de la experiencia.',
  ],
  [/^must be after startAt$/, () => 'Tiene que ser posterior al inicio.'],
  [/^must be in the future$/, () => 'Elige una fecha futura.'],
  [/^already has a departure of this experience$/, () => 'Ya hay una salida de esta experiencia a esa hora.'],
  [/^of a cancelled departure cannot be changed$/, () => 'Una salida cancelada no se puede reabrir.'],
  [/^cannot be completed before the departure ends$/, () => 'Solo se puede marcar como realizada cuando ya ha terminado.'],
  [/^must contain at least one letter and one number$/, () => 'Usa al menos una letra y un número.'],
  [/^is not allowed$/, () => 'Este dato no se puede enviar.'],
  [/^and longitude must be sent together$/, () => 'Indica la latitud y la longitud, o ninguna de las dos.'],
  [/^must be an integer$/, () => 'Escribe un número entero.'],
  [/^must have at most 2 decimals$/, () => 'Usa como mucho dos decimales.'],
  [/^is required$/, () => 'Este campo es obligatorio.'],
  [/^cannot be empty$/, () => 'Este campo no puede quedar vacío.'],
  [/^must be at least (\d+) characters$/, (m) => `Escribe al menos ${m[1]} caracteres.`],
  [/^must be at most (\d+) characters$/, (m) => `Escribe como máximo ${m[1]} caracteres.`],
  [/^must be greater than or equal to (.+)$/, (m) => `El valor mínimo es ${m[1]}.`],
  [/^must be less than or equal to (.+)$/, (m) => `El valor máximo es ${m[1]}.`],
  [/^must be greater than (.+)$/, (m) => `Tiene que ser mayor que ${m[1]}.`],
  [/^must be less than (.+)$/, (m) => `Tiene que ser menor que ${m[1]}.`],
  [/^must be one of: (.+)$/, (m) => `Elige uno de estos valores: ${m[1]}.`],
  [/^must be a valid number$/, () => 'Escribe un número.'],
  [/^must be a valid boolean$/, () => 'Indica sí o no.'],
  [/^must be a valid \w+$/, () => 'El tipo de dato no es válido.'],
  [/^has an invalid format$/, () => 'El formato no es válido.'],
];

/**
 * La API escribe los errores de campo en inglés, como "distance must be greater
 * than or equal to 0". Aquí se pasan al idioma del panel; lo que no se reconoce
 * se muestra como un error genérico.
 */
export function translateFieldMessage(field: string, message: string): string {
  const rule = message.startsWith(`${field} `) ? message.slice(field.length + 1) : message;

  for (const [pattern, translate] of FIELD_RULES) {
    const match = rule.match(pattern);
    if (match) return translate(match);
  }

  return 'El valor no es válido.';
}
