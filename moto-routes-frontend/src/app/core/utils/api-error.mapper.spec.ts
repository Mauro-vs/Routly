import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

import { ApiError } from '../models/api-error.model';
import { toApiError, translateFieldMessage } from './api-error.mapper';

function httpError(status: number, body: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, url: 'http://localhost:3000/api/routes' });
}

describe('toApiError', () => {
  it('devuelve tal cual un ApiError ya normalizado', () => {
    const original = new ApiError({ status: 404, type: 'client', message: 'x' });
    expect(toApiError(original)).toBe(original);
  });

  it('clasifica como red una petición sin respuesta', () => {
    const error = toApiError(httpError(0));
    expect(error.type).toBe('network');
    expect(error.status).toBe(0);
  });

  it('clasifica como tiempo de espera el corte del timeoutInterceptor', () => {
    expect(toApiError(new TimeoutError()).type).toBe('timeout');
  });

  it('clasifica como servidor cualquier 5xx y guarda el mensaje original', () => {
    const error = toApiError(httpError(500, { message: 'Internal server error' }));
    expect(error.type).toBe('server');
    expect(error.detail).toBe('Internal server error');
  });

  it('lee los errores por campo de un 400 y los traduce', () => {
    const error = toApiError(
      httpError(400, {
        statusCode: 400,
        message: 'Validation failed',
        details: [
          { field: 'title', message: 'title is required' },
          { field: 'distance', message: 'distance must be greater than or equal to 0' },
          { field: 'distance', message: 'distance must be a valid number' },
        ],
      }),
    );

    expect(error.type).toBe('validation');
    expect(error.fieldErrors).toEqual({
      title: 'Este campo es obligatorio.',
      distance: 'El valor mínimo es 0.',
    });
  });

  it('trata un 422 igual que un 400', () => {
    expect(toApiError(httpError(422)).type).toBe('validation');
  });

  it('deja sin errores por campo un 400 que no trae details', () => {
    const error = toApiError(httpError(400, { message: 'Malformed JSON in request body' }));
    expect(error.type).toBe('validation');
    expect(error.fieldErrors).toBeUndefined();
  });

  it('marca 404 y 409 como errores de cliente reconocibles', () => {
    expect(toApiError(httpError(404)).isNotFound).toBeTrue();
    expect(toApiError(httpError(409)).isConflict).toBeTrue();
    expect(toApiError(httpError(404)).type).toBe('client');
  });

  it('traduce el motivo de cada 409 y guarda el mensaje original', () => {
    const conflict = (message: string) => toApiError(httpError(409, { message })).message;

    expect(conflict('Cannot delete a route that has experiences')).toBe(
      'No se puede eliminar: tiene experiencias.',
    );
    expect(conflict('Cannot restore: categoryId references a deleted category')).toBe(
      'No se puede restaurar mientras su categoría siga en la papelera.',
    );
    expect(conflict('Route is not deleted')).toBe('Ese registro ya estaba restaurado.');
    expect(conflict('Something else')).toBe('Ya existe un registro con esos datos.');
    expect(conflict('System roles cannot be deleted')).toBe('Los roles base no se pueden eliminar.');
    expect(conflict('A route with this slug already exists')).toBe(
      'Ya existe una ruta con esa dirección.',
    );
    expect(toApiError(httpError(409, { message: 'Route is not deleted' })).detail).toBe(
      'Route is not deleted',
    );
  });

  it('reconoce el 409 por una referencia eliminada', () => {
    const blocked = toApiError(
      httpError(409, { message: 'Cannot restore: startLocationId references a deleted location' }),
    );
    const restored = toApiError(httpError(409, { message: 'Route is not deleted' }));

    expect(blocked.isMissingReference).toBeTrue();
    expect(restored.isMissingReference).toBeFalse();
  });

  it('convierte un error que no es HTTP en uno genérico', () => {
    const error = toApiError(new TypeError('boom'));
    expect(error.type).toBe('client');
    expect(error.status).toBe(0);
  });
});

describe('translateFieldMessage', () => {
  const cases: Array<[string, string, string]> = [
    ['title', 'title cannot be empty', 'Este campo no puede quedar vacío.'],
    ['title', 'title must be at most 120 characters', 'Escribe como máximo 120 caracteres.'],
    ['difficulty', 'difficulty must be one of: easy, medium, hard', 'Elige uno de estos valores: easy, medium, hard.'],
    ['duration', 'duration must be a valid number', 'Escribe un número.'],
    ['id', 'id has an invalid format', 'El formato no es válido.'],
    ['categoryId', 'categoryId must reference an active category', 'Elige una categoría activa.'],
    ['roleId', 'roleId must reference an active role', 'Elige un rol activo.'],
    ['capacity', 'capacity must be an integer', 'Escribe un número entero.'],
    [
      'maxParticipants',
      'maxParticipants must be greater than or equal to minParticipants',
      'No puede ser menor que el mínimo de participantes.',
    ],
    [
      'latitude',
      'latitude and longitude must be sent together',
      'Indica la latitud y la longitud, o ninguna de las dos.',
    ],
    ['sku', 'sku cannot be changed', 'Este dato no se puede cambiar.'],
    ['title', 'title is weird', 'El valor no es válido.'],
  ];

  it('un 409 por duplicado dice qué dato está repetido', () => {
    const message = (detail: string): string =>
      toApiError(httpError(409, { statusCode: 409, message: detail })).message;

    expect(message('A category with this name already exists')).toBe(
      'Ya existe una categoría con ese nombre.',
    );
    expect(message('A location with this city, region and country already exists')).toBe(
      'Ya existe una ubicación con esa ciudad, región y país.',
    );
    expect(message('A user with this email already exists')).toBe('Ya existe un usuario con ese email.');
  });

  it('un duplicado que está en la papelera lo dice', () => {
    const message = (detail: string): string =>
      toApiError(httpError(409, { statusCode: 409, message: detail })).message;

    expect(message('A category with this name already exists in the trash')).toBe(
      'Ya existe una categoría con ese nombre en la papelera: se puede restaurar desde allí.',
    );
    expect(message('This user already has a host profile in the trash')).toBe(
      'Ese usuario ya tiene un perfil de anfitrión en la papelera: se puede restaurar desde allí.',
    );
  });

  it('un PATCH sin campos se explica como "no hay cambios"', () => {
    const error = toApiError(httpError(400, { statusCode: 400, message: 'No fields to update' }));
    expect(error.type).toBe('validation');
    expect(error.message).toBe('No has cambiado ningún dato: no hay nada que guardar.');
  });

  for (const [field, message, expected] of cases) {
    it(`traduce "${message}"`, () => {
      expect(translateFieldMessage(field, message)).toBe(expected);
    });
  }
});
