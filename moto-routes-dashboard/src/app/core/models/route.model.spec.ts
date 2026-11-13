import { Route, categoryName, missingReferences, routeTrip } from './route.model';

function route(overrides: Partial<Route> = {}): Route {
  return {
    _id: '1',
    slug: 'caminos-de-mallorca-df38e9',
    title: 'Caminos de Mallorca',
    difficulty: 'medium',
    distance: 120,
    duration: 3,
    categoryId: 'c',
    category: { _id: 'c', name: 'Montaña', slug: 'montana' },
    startLocationId: 'a',
    startLocation: { _id: 'a', city: 'Palma', country: 'España', slug: 'palma' },
    endLocationId: 'b',
    endLocation: { _id: 'b', city: 'Sóller', country: 'España', slug: 'soller' },
    status: 'active',
    isActive: true,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('route.model', () => {
  it('routeTrip lee el origen y el destino de sus ubicaciones', () => {
    expect(routeTrip(route())).toEqual({ from: 'Palma', to: 'Sóller', text: 'Palma a Sóller' });
  });

  it('routeTrip avisa si una ubicación ya no existe', () => {
    expect(routeTrip(route({ endLocation: null })).to).toBe('Ubicación eliminada');
  });

  it('categoryName avisa si la categoría ya no existe', () => {
    expect(categoryName(route())).toBe('Montaña');
    expect(categoryName(route({ category: null }))).toBe('Categoría eliminada');
  });

  it('missingReferences lista lo que impide restaurar una ruta de la papelera', () => {
    expect(missingReferences(route())).toEqual([]);
    expect(missingReferences(route({ category: null, startLocation: null }))).toEqual([
      'su categoría',
      'una de sus ubicaciones',
    ]);
  });
});
