import type { Lancamento } from '../dominio/lancamento';
import { dataNoMes, mesDaData, somarMeses } from './datas';

/**
 * Parte uma compra parcelada em Lançamentos, um por mês, no mesmo dia da compra.
 * O resto dos centavos fica na primeira Parcela, para a soma bater com o total.
 */
export function gerarParcelas(compra: Lancamento, parcelas: number, novoId: () => string): Lancamento[] {
  if (parcelas <= 1) return [compra];
  const base = Math.floor(compra.valor / parcelas);
  const dia = Number(compra.data.slice(8, 10));
  return Array.from({ length: parcelas }, (_, i) => ({
    ...compra,
    id: i === 0 ? compra.id : novoId(),
    valor: i === 0 ? compra.valor - base * (parcelas - 1) : base,
    data: dataNoMes(somarMeses(mesDaData(compra.data), i), dia),
    parcela: { atual: i + 1, total: parcelas },
    compraId: compra.id,
  }));
}
