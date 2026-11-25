// Casos achados na auditoria da Fase B.
import { describe, expect, it } from 'vitest';
import type { Fixo } from '../dominio/fixo';
import type { Divida } from '../dominio/onboarding';
import { avaliarCompra } from './compra';
import { compararMetodos } from './dividas';
import { editarFixo, encerrarFixo, fixosDoMes } from './fixos';
import { ana, entrada } from './teste/pessoas';

describe('Auditoria da Fase B', () => {
  it('editar um Fixo antes do encerramento mantém o encerramento', () => {
    const academia: Fixo = { id: 'a', versoes: [{ aPartirDe: '2026-12', nome: 'Academia', valor: 12000, dia: 5, categoriaId: 'treino', forma: 'cartao' }] };
    const editado = editarFixo(encerrarFixo(academia, '2027-06'), '2027-02', { valor: 15000 });
    expect(fixosDoMes([editado], '2027-03')[0]?.valor).toBe(15000);
    expect(fixosDoMes([editado], '2027-06')).toEqual([]);
  });

  it('quando um método não quita, a diferença em meses não é inventada', () => {
    const impagavel: Divida = { id: 'x', nome: 'x', tipo: 'emprestimo', saldo: 100000, jurosMensal: 0.15, parcela: 10000, emAtraso: false };
    expect(compararMetodos([impagavel], 0, 400000).diferencaEmMeses).toBeNull();
  });

  it('Pix no "Posso comprar?" não muda a Previsão de fatura', () => {
    const comCartao = entrada(ana, { cartao: { diaDeFechamento: 5, diaDeVencimento: 15 } });
    const r = avaliarCompra(comCartao, { preco: 10000, parcelas: 1, categoriaId: 'pix-pessoas' });
    expect(r.previsao).toEqual({ antes: 0, depois: 0 });
  });
});
