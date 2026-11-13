import { COLLECTION_IDS, NAV_GROUPS, findSection } from './navigation';

describe('navigation', () => {
  it('la portada solo coincide con la URL exacta', () => {
    expect(findSection('/')?.id).toBe('overview');
    expect(findSection('/otra-cosa')).toBeNull();
  });

  it('las páginas de una entidad pertenecen a su sección', () => {
    expect(findSection('/routes')?.id).toBe('routes');
    expect(findSection('/routes/new')?.id).toBe('routes');
    expect(findSection('/routes/costa-brava-loop-df38e5/edit')?.id).toBe('routes');
  });

  it('la papelera es parte de la sección de su colección', () => {
    expect(findSection('/routes/trash')?.id).toBe('routes');
  });

  it('una sección sin páginas todavía no se marca', () => {
    const pending = NAV_GROUPS.flatMap((group) => group.items).find((item) => item.pending);
    if (pending) expect(findSection(pending.path)).toBeNull();
  });

  it('las diez colecciones llevan contador con el nombre de su ruta en la API', () => {
    expect([...COLLECTION_IDS].sort()).toEqual(
      [
        'bikes',
      'categories',
        'departures',
        'experiences',
        'hosts',
        'images',
        'locations',
        'roles',
        'routes',
        'users',
      ].sort(),
    );
  });
});
