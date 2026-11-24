import { describe, expect, it } from 'vitest';
import { CATEGORIAS_PADRAO, criarCategoriaPropria, montarCategorias } from './categorias';

describe('Categorias próprias e escondidas', () => {
  const pet = criarCategoriaPropria('pet-1', '  Pet ', 'essencial');

  it('uma Categoria própria tem nome limpo, Grupo escolhido e não é padrão', () => {
    expect(pet).toEqual({ id: 'pet-1', nome: 'Pet', grupo: 'essencial', palavrasChave: [], padrao: false });
  });

  it('as próprias aparecem junto com as padrão, antes de Outros', () => {
    const { visiveis } = montarCategorias([pet], []);
    expect(visiveis).toHaveLength(18);
    expect(visiveis.at(-2)?.id).toBe('pet-1');
    expect(visiveis.at(-1)?.id).toBe('outros');
  });

  it('uma Categoria escondida some do lançamento mas continua em todas, para os Lançamentos antigos', () => {
    const { visiveis, todas } = montarCategorias([], ['delivery']);
    expect(visiveis.some((c) => c.id === 'delivery')).toBe(false);
    expect(todas.some((c) => c.id === 'delivery')).toBe(true);
  });

  it('Outros nunca é escondida, para todo Lançamento ter onde cair', () => {
    expect(montarCategorias([], ['outros']).visiveis.some((c) => c.id === 'outros')).toBe(true);
  });

  it('as 17 padrão continuam existindo', () => {
    expect(montarCategorias([pet], CATEGORIAS_PADRAO.map((c) => c.id)).todas).toHaveLength(18);
  });
});
