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

describe('Leitor de compra parcelada', () => {
  it('entende "notebook 3000 10x" como R$ 3.000 em 10 Parcelas', () => {
    expect(ler('notebook 3000 10x')).toEqual({ valor: 300000, loja: 'Notebook', categoriaId: null, parcelas: 10 });
  });

  it('entende "tênis 480 em 3x"', () => {
    expect(ler('tênis 480 em 3x')).toMatchObject({ valor: 48000, loja: 'Tênis', parcelas: 3 });
  });

  it('entende "3 vezes" e "10 x" separado', () => {
    expect(ler('sofá 1200 em 3 vezes')).toMatchObject({ valor: 120000, loja: 'Sofá', parcelas: 3 });
    expect(ler('geladeira 2400 12 x')).toMatchObject({ valor: 240000, loja: 'Geladeira', parcelas: 12 });
  });

  it('entende as Parcelas antes do valor: "10x notebook 3000"', () => {
    expect(ler('10x notebook 3000')).toMatchObject({ valor: 300000, loja: 'Notebook', parcelas: 10 });
  });

  it('"3x de 160" fala do valor da Parcela: o total é 3 vezes 160', () => {
    expect(ler('tênis 3x de 160')).toMatchObject({ valor: 48000, loja: 'Tênis', parcelas: 3 });
  });

  it('aceita centavos e milhar no valor parcelado', () => {
    expect(ler('notebook 3.499,90 em 10x')).toMatchObject({ valor: 349990, parcelas: 10 });
  });

  it('sem "x" não é parcelado, e não confunde número no nome da Loja', () => {
    expect(ler('99 food 30').parcelas).toBeUndefined();
    expect(ler('ifood 42').parcelas).toBeUndefined();
  });

  it('"1x" é à vista e não vira Parcela', () => {
    expect(ler('tênis 480 1x')).toEqual({ valor: 48000, loja: 'Tênis', categoriaId: null });
  });

  it('mantém a Categoria sugerida pela Loja', () => {
    expect(ler('farmácia 300 em 3x')).toMatchObject({ categoriaId: 'saude', parcelas: 3 });
  });
});
