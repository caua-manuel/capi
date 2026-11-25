import { describe, expect, it } from 'vitest';
import type { LinhaDeFatura } from '../dominio/fatura';
import type { Lancamento } from '../dominio/lancamento';
import type { OcorrenciaDeFixo } from '../motor/fixos';
import { conciliar, type EntradaDaConciliacao } from './conciliacao';

// Dados fictícios. Nenhuma fatura real.
const linha = (id: string, data: string, loja: string, valor: number, extra: Partial<LinhaDeFatura> = {}): LinhaDeFatura => ({
  id, data, loja, valor, tipo: 'compra', ...extra,
});
const lancamento = (id: string, data: string, loja: string, valor: number, categoriaId = 'delivery', extra: Partial<Lancamento> = {}): Lancamento => ({
  id, data, loja, valor, categoriaId, origem: 'manual', criadoEm: `${data}T12:00:00Z`, ...extra,
});
const academia: OcorrenciaDeFixo = { fixoId: 'academia', nome: 'Academia', valor: 9990, data: '2026-11-05', categoriaId: 'treino', forma: 'cartao' };

const sugestoes: Record<string, string> = { 'mercado central': 'mercado', 'ifood lanches': 'delivery' };
const base = (parcial: Partial<EntradaDaConciliacao>): EntradaDaConciliacao => ({
  linhas: [], lancamentos: [], fixosNoCartao: [], periodo: { de: '2026-10-06', ate: '2026-11-05' },
  sugerirCategoria: (loja) => sugestoes[loja.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()] ?? null,
  agora: '2026-11-06T10:00:00Z', ...parcial,
});

describe('Conciliação', () => {
  it('junta por mesmo valor, data até 3 dias e nome parecido', () => {
    const r = conciliar(base({
      linhas: [linha('l1', '2026-10-21', 'IFOOD *LANCHES', 4200)],
      lancamentos: [lancamento('m1', '2026-10-19', 'iFood', 4200)],
    }));
    expect(r.pares).toEqual([{ linhaId: 'l1', lancamentoId: 'm1' }]);
    expect(r.novos).toEqual([]);
  });

  it('a Fatura prevalece na data e a Categoria do Usuário é mantida', () => {
    const r = conciliar(base({
      linhas: [linha('l1', '2026-10-21', 'IFOOD *LANCHES', 4200, { categoriaId: 'comida-fora' })],
      lancamentos: [lancamento('m1', '2026-10-19', 'iFood', 4200, 'delivery')],
    }));
    expect(r.atualizados).toEqual([expect.objectContaining({ id: 'm1', data: '2026-10-21', valor: 4200, categoriaId: 'delivery', idDaLinha: 'l1' })]);
  });

  it('não junta com mais de 3 dias de diferença', () => {
    const r = conciliar(base({
      linhas: [linha('l1', '2026-10-25', 'IFOOD *LANCHES', 4200)],
      lancamentos: [lancamento('m1', '2026-10-21', 'iFood', 4200)],
    }));
    expect(r.pares).toEqual([]);
  });

  it('não junta valores diferentes', () => {
    const r = conciliar(base({
      linhas: [linha('l1', '2026-10-21', 'IFOOD *LANCHES', 4300)],
      lancamentos: [lancamento('m1', '2026-10-21', 'iFood', 4200)],
    }));
    expect(r.pares).toEqual([]);
  });

  it('linha sem par vira Lançamento novo com a Categoria sugerida', () => {
    const r = conciliar(base({ linhas: [linha('l1', '2026-10-22', 'MERCADO CENTRAL', 23400)] }));
    expect(r.novos).toEqual([expect.objectContaining({ loja: 'MERCADO CENTRAL', valor: 23400, categoriaId: 'mercado', data: '2026-10-22', origem: 'importacao', idDaLinha: 'l1' })]);
  });

  it('Fixo no cartão com mesmo valor e data parecida não vira Lançamento novo', () => {
    const r = conciliar(base({ fixosNoCartao: [academia], linhas: [linha('l1', '2026-11-04', 'SMARTFIT UNIDADE', 9990)] }));
    expect(r.pares).toEqual([{ linhaId: 'l1', fixoId: 'academia' }]);
    expect(r.novos).toEqual([]);
  });

  it('pagamento de fatura e estornos são ignorados; o IOF vira Lançamento separado', () => {
    const r = conciliar(base({
      linhas: [
        linha('p', '2026-10-10', 'PAGAMENTO DE FATURA', 150000, { tipo: 'pagamento' }),
        linha('e', '2026-10-12', 'ESTORNO LOJA', 5000, { tipo: 'estorno' }),
        linha('i', '2026-10-13', 'IOF COMPRA INTERNACIONAL', 350, { tipo: 'iof' }),
      ],
    }));
    expect(r.ignoradas.sort()).toEqual(['e', 'p']);
    expect(r.novos).toEqual([expect.objectContaining({ idDaLinha: 'i', loja: 'IOF', valor: 350 })]);
  });
});

describe('Revisar', () => {
  it('Lançamento manual do período sem par na Fatura vai para Revisar', () => {
    const r = conciliar(base({ lancamentos: [lancamento('m1', '2026-10-15', 'Padaria', 1500, 'comida-fora')] }));
    expect(r.revisar).toEqual([{ motivo: 'lancamento-sem-par', lancamentoId: 'm1' }]);
  });

  it('Pix lançado à mão não vai para Revisar: ele nunca aparece na Fatura', () => {
    const r = conciliar(base({ lancamentos: [lancamento('m1', '2026-10-15', 'pix joão', 5000, 'pix-pessoas')] }));
    expect(r.revisar).toEqual([]);
  });

  it('mesmo valor e data mas nome diferente é linha duvidosa: vai para Revisar e não duplica', () => {
    const r = conciliar(base({
      linhas: [linha('l1', '2026-10-21', 'POSTO AVENIDA', 4200)],
      lancamentos: [lancamento('m1', '2026-10-21', 'iFood', 4200)],
    }));
    expect(r.pares).toEqual([]);
    expect(r.novos).toEqual([]);
    expect(r.revisar).toContainEqual({ motivo: 'linha-duvidosa', linhaId: 'l1', lancamentoId: 'm1' });
  });

  it('linha sem Categoria sugerida vai para Outros e para Revisar', () => {
    const r = conciliar(base({ linhas: [linha('l1', '2026-10-22', 'LOJA DESCONHECIDA', 7000)] }));
    expect(r.novos[0]!.categoriaId).toBe('outros');
    expect(r.revisar).toContainEqual({ motivo: 'sem-categoria', linhaId: 'l1' });
  });
});

describe('Importar a mesma Fatura duas vezes', () => {
  it('não duplica nada', () => {
    const linhas = [linha('l1', '2026-10-21', 'IFOOD *LANCHES', 4200), linha('l2', '2026-10-22', 'MERCADO CENTRAL', 23400)];
    const primeira = conciliar(base({ linhas, lancamentos: [lancamento('m1', '2026-10-19', 'iFood', 4200)] }));
    const depois = [...primeira.atualizados, ...primeira.novos];
    const segunda = conciliar(base({ linhas, lancamentos: depois }));
    expect(segunda.novos).toEqual([]);
    expect(segunda.atualizados).toEqual([]);
    expect(segunda.jaImportadas.sort()).toEqual(['l1', 'l2']);
  });
});
