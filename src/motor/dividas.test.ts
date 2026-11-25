import { describe, expect, it } from 'vitest';
import type { Divida } from '../dominio/onboarding';
import { compararMetodos, simularQuitacao } from './dividas';
import { bruno, carla, onboarding, rodar } from './teste/pessoas';

const divida = (id: string, saldo: number, jurosMensal: number, parcela: number, extra: Partial<Divida> = {}): Divida => ({
  id, nome: id, tipo: 'emprestimo', saldo, jurosMensal, parcela, emAtraso: false, ...extra,
});

describe('Simulação mês a mês', () => {
  it('sem juros, R$ 1.000 a R$ 100 por mês quita em 10 meses', () => {
    const r = simularQuitacao([divida('a', 100000, 0, 10000)], 0, 'avalanche');
    expect(r.meses).toBe(10);
    expect(r.jurosTotais).toBe(0);
  });

  it('com juros, os juros de cada mês entram no saldo antes do pagamento', () => {
    // R$ 1.000 a 1% a.m. pagando R$ 100: 11 meses e uns R$ 58 de juros
    const r = simularQuitacao([divida('a', 100000, 0.01, 10000)], 0, 'avalanche');
    expect(r.meses).toBe(11);
    expect(r.jurosTotais).toBeGreaterThan(5000);
    expect(r.jurosTotais).toBeLessThan(6000);
  });

  it('avalanche paga primeiro a de maior juros; bola de neve, a de menor saldo', () => {
    const dividas = [divida('cara', 200000, 0.1, 20000), divida('pequena', 50000, 0.03, 5000)];
    expect(simularQuitacao(dividas, 20000, 'avalanche').ordem).toEqual(['cara', 'pequena']);
    expect(simularQuitacao(dividas, 20000, 'bola-de-neve').ordem).toEqual(['pequena', 'cara']);
  });

  it('quando uma dívida acaba, a parcela dela vai para a próxima', () => {
    const dividas = [divida('a', 30000, 0, 10000), divida('b', 100000, 0, 10000)];
    // Mês 1 a 3: a quitada; depois b recebe 200 por mês
    expect(simularQuitacao(dividas, 0, 'bola-de-neve').quitacao).toEqual({ a: 3, b: 7 });
  });

  it('parcela menor que os juros e sem extra nunca quita', () => {
    expect(simularQuitacao([divida('a', 100000, 0.15, 10000)], 0, 'avalanche').meses).toBeNull();
  });
});

describe('Avalanche x bola de neve', () => {
  const dividas = [divida('cartao', 300000, 0.12, 20000), divida('loja', 80000, 0.04, 8000), divida('banco', 150000, 0.03, 10000)];

  it('avalanche nunca paga mais juros que bola de neve', () => {
    const c = compararMetodos(dividas, 30000, 500000);
    expect(c.avalanche.jurosTotais).toBeLessThanOrEqual(c.bolaDeNeve.jurosTotais);
  });

  it('mostra a diferença em reais e em meses', () => {
    const c = compararMetodos(dividas, 30000, 500000);
    expect(c.diferencaEmReais).toBe(c.bolaDeNeve.jurosTotais - c.avalanche.jurosTotais);
    expect(c.diferencaEmMeses).toBe((c.bolaDeNeve.meses ?? 0) - (c.avalanche.meses ?? 0));
  });

  it('recomenda avalanche por padrão', () => {
    expect(compararMetodos(dividas, 30000, 200000).recomendado).toBe('avalanche');
  });

  it('recomenda bola de neve com 3 ou mais dívidas pequenas', () => {
    const pequenas = [divida('a', 40000, 0.05, 5000), divida('b', 60000, 0.04, 6000), divida('c', 30000, 0.06, 3000)];
    expect(compararMetodos(pequenas, 10000, 300000).recomendado).toBe('bola-de-neve');
  });
});

describe('Dívidas na saída do Motor', () => {
  it('quem não tem dívidas não recebe comparação', () => {
    expect(rodar(carla).dividas).toBeNull();
  });

  it('o extra por mês além das parcelas é a Sobra, quando existe', () => {
    const comSobra = onboarding({ ...carla, dividas: [divida('d', 500000, 0.03, 30000)] });
    const saida = rodar(comSobra);
    expect(saida.dividas!.extraPorMes).toBe(saida.diagnostico.sobra);
  });

  it('a renegociação diz quanto pode pagar por mês e pede troca do rotativo', () => {
    const { dividas } = rodar(bruno);
    expect(dividas!.renegociacao.podePagarPorMes).toBe(40000);
    expect(dividas!.renegociacao.credores).toEqual([{ dividaId: 'cartao', nome: 'Cartão', trocarRotativo: true }]);
  });

  it('dívida em atraso é aperto grave e mostra onde buscar ajuda', () => {
    const atrasado = onboarding({ ...bruno, dividas: [{ ...bruno.dividas[0]!, emAtraso: true }] });
    const { dividas } = rodar(atrasado);
    expect(dividas!.apertoGrave).toBe(true);
    expect(dividas!.ajuda).toEqual(['Serasa Limpa Nome', 'Desenrola', 'o próprio credor', 'Procon']);
  });

  it('dívidas maiores que 6 meses de renda são aperto grave', () => {
    const muito = onboarding({ ...bruno, dividas: [divida('grande', 1600000, 0.02, 30000)] });
    expect(rodar(muito).dividas!.apertoGrave).toBe(true);
  });

  it('sem atraso e com dívida pequena não é aperto grave', () => {
    expect(rodar(bruno).dividas!.apertoGrave).toBe(false);
  });
});
