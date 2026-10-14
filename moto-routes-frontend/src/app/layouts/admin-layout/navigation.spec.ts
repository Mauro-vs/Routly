import { findParent, findSection } from './navigation';

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

  it('la papelera gana a la sección de rutas aunque la URL empiece igual', () => {
    expect(findSection('/routes/trash')?.id).toBe('routes-trash');
  });

  it('la papelera cuelga de rutas', () => {
    const trash = findSection('/routes/trash');
    expect(trash && findParent(trash)?.id).toBe('routes');
  });
});
