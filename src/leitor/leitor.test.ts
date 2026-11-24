import { describe, expect, it } from 'vitest';
import { lerLancamento } from './leitor';
import { CATEGORIAS_PADRAO } from '../dominio/categorias';

const ler = (texto: string, regras: Record<string, string> = {}) => lerLancamento(texto, CATEGORIAS_PADRAO, regras);

describe('Leitor de lançamento', () => {
  it('entende "ifood 42" como R$ 42,00 no iFood, sugerindo Delivery', () => {
    expect(ler('ifood 42')).toEqual({ valor: 4200, loja: 'Ifood', categoriaId: 'delivery' });
  });

  it('entende valor com vírgula', () => {
    expect(ler('mercado 42,90').valor).toBe(4290);
  });

  it('entende valor com ponto decimal', () => {
    expect(ler('uber 18.5').valor).toBe(1850);
  });

  it('entende milhar com ponto e centavos com vírgula', () => {
    expect(ler('notebook 3.499,90').valor).toBe(349990);
  });

  it('entende ponto seguido de três dígitos como milhar', () => {
    expect(ler('aluguel 1.500').valor).toBe(150000);
  });

  it('aceita o valor antes da Loja e com R$', () => {
    expect(ler('R$ 25 padaria')).toEqual({ valor: 2500, loja: 'Padaria', categoriaId: 'comida-fora' });
  });

  it('entende "pix joão 50" como Pix para pessoas com Loja João', () => {
    expect(ler('pix joão 50')).toEqual({ valor: 5000, loja: 'João', categoriaId: 'pix-pessoas' });
  });

  it('sugere Categoria ignorando acento e maiúsculas', () => {
    expect(ler('FARMÁCIA 30').categoriaId).toBe('saude');
  });

  it('a palavra-chave mais longa vence: "barbearia" é Cuidados pessoais, não "bar"', () => {
    expect(ler('barbearia 40').categoriaId).toBe('cuidados-pessoais');
  });

  it('não sugere Categoria quando nenhuma palavra-chave casa', () => {
    expect(ler('xyzabc 10').categoriaId).toBeNull();
  });

  it('a Regra de estabelecimento vence a palavra-chave', () => {
    expect(ler('ifood 42', { ifood: 'mercado' }).categoriaId).toBe('mercado');
  });

  it('devolve valor nulo quando não há número', () => {
    expect(ler('ifood')).toEqual({ valor: null, loja: 'Ifood', categoriaId: 'delivery' });
  });

  it('texto vazio não tem valor, Loja nem Categoria', () => {
    expect(ler('   ')).toEqual({ valor: null, loja: '', categoriaId: null });
  });
});

describe('Categorias padrão', () => {
  it('existem 17, cada uma com Grupo e palavras-chave', () => {
    expect(CATEGORIAS_PADRAO).toHaveLength(17);
    for (const c of CATEGORIAS_PADRAO) {
      expect(['essencial', 'estilo-de-vida', 'guardar-quitar']).toContain(c.grupo);
      expect(c.padrao).toBe(true);
    }
  });
});
