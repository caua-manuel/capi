import { describe, expect, it } from 'vitest';
import type { Fixo } from '../dominio/fixo';
import { editarFixo, encerrarFixo, fixosDoMes, fixosDoOnboarding, sincronizarFixosDoOnboarding } from './fixos';
import { ana, entrada, rodar } from './teste/pessoas';
import { calcular } from './index';

const academia: Fixo = {
  id: 'academia',
  versoes: [{ aPartirDe: '2026-12', nome: 'Academia', valor: 12000, dia: 5, categoriaId: 'treino', forma: 'cartao' }],
};
const aluguel: Fixo = {
  id: 'aluguel',
  versoes: [{ aPartirDe: '2026-12', nome: 'Aluguel', valor: 150000, dia: 31, categoriaId: 'casa-contas', forma: 'fora' }],
};

describe('Fixos no Mês do plano', () => {
  it('cada Fixo entra no Mês do plano no seu dia', () => {
    expect(fixosDoMes([academia], '2027-01')).toEqual([
      expect.objectContaining({ fixoId: 'academia', valor: 12000, data: '2027-01-05' }),
    ]);
  });

  it('dia 31 cai no último dia dos meses mais curtos', () => {
    expect(fixosDoMes([aluguel], '2027-02')[0]?.data).toBe('2027-02-28');
  });

  it('um Fixo não entra em meses antes de ser cadastrado', () => {
    expect(fixosDoMes([academia], '2026-11')).toEqual([]);
  });

  it('editar um Fixo vale a partir do mês atual, sem mudar meses fechados', () => {
    const editado = editarFixo(academia, '2027-03', { valor: 15000 });
    expect(fixosDoMes([editado], '2027-02')[0]?.valor).toBe(12000);
    expect(fixosDoMes([editado], '2027-03')[0]?.valor).toBe(15000);
    expect(fixosDoMes([editado], '2027-08')[0]?.valor).toBe(15000);
  });

  it('editar duas vezes no mesmo mês troca a versão daquele mês', () => {
    const editado = editarFixo(editarFixo(academia, '2027-03', { valor: 15000 }), '2027-03', { dia: 10 });
    expect(editado.versoes).toHaveLength(2);
    expect(fixosDoMes([editado], '2027-03')[0]).toMatchObject({ valor: 15000, data: '2027-03-10' });
  });

  it('encerrar um Fixo tira ele dos meses seguintes e mantém os anteriores', () => {
    const encerrado = encerrarFixo(academia, '2027-04');
    expect(fixosDoMes([encerrado], '2027-03')).toHaveLength(1);
    expect(fixosDoMes([encerrado], '2027-04')).toEqual([]);
  });
});

describe('Fixos na entrada do Motor', () => {
  it('um Fixo fora do cartão conta no mês mas não na Fatura', () => {
    const saida = calcular(entrada(ana, { fixos: [academia, aluguel] }));
    expect(saida.mesDoPlano.fixos.map((f) => f.fixoId)).toEqual(['academia', 'aluguel']);
    expect(saida.mesDoPlano.fixosNoCartao.map((f) => f.fixoId)).toEqual(['academia']);
    expect(saida.mesDoPlano.totalDosFixos).toBe(162000);
  });

  it('os Fixos do Onboarding entram no Diagnóstico', () => {
    // Moradia 300 + celular 60 + academia 120
    expect(rodar(ana).diagnostico.fixos).toBe(48000);
  });
});

describe('Fixos declarados no Onboarding', () => {
  it('a moradia e os fixos da pergunta 6 viram Fixos fora do cartão', () => {
    const fixos = fixosDoOnboarding(ana, '2026-11');
    expect(fixos.map((f) => f.versoes[0]?.nome)).toEqual(['Moradia', 'Celular', 'Academia']);
    expect(fixos.every((f) => f.versoes[0]?.forma === 'fora')).toBe(true);
  });

  it('responder o Onboarding de novo atualiza os Fixos dele a partir do mês atual', () => {
    const cadastrados = sincronizarFixosDoOnboarding([], ana, '2026-11');
    const novaAna = { ...ana, fixos: [{ id: 'celular', nome: 'Celular', valor: 8000, categoriaId: 'casa-contas', dia: 10 }] };
    const depois = sincronizarFixosDoOnboarding(cadastrados, novaAna, '2027-01');
    const nomesEValores = (mes: string) => fixosDoMes(depois, mes).map((f) => `${f.nome} ${f.valor}`).sort();
    expect(nomesEValores('2026-12')).toEqual(['Academia 12000', 'Celular 6000', 'Moradia 30000']);
    expect(nomesEValores('2027-01')).toEqual(['Celular 8000', 'Moradia 30000']);
  });

  it('sincronizar não mexe nos Fixos cadastrados à mão', () => {
    const depois = sincronizarFixosDoOnboarding([academia], ana, '2026-12');
    expect(depois.find((f) => f.id === 'academia')).toEqual(academia);
  });

  it('sincronizar sem mudanças não cria versões novas', () => {
    const cadastrados = sincronizarFixosDoOnboarding([], ana, '2026-11');
    expect(sincronizarFixosDoOnboarding(cadastrados, ana, '2027-02')).toEqual(cadastrados);
  });
});
