import { describe, expect, it } from 'vitest';
import type { Divida } from '../dominio/onboarding';
import type { Meta } from '../dominio/meta';
import { analisarDividas } from './dividas';
import { perfilDeInvestidorDe, sugerirInvestimento } from './investir';
import { ana, onboarding, rodar } from './teste/pessoas';

const viagem: Meta = {
  id: 'viagem', nome: 'Viagem', objetivo: 'viagem', valorAlvo: 600000, valorAtual: 0, dataAlvo: '2027-10', prioridade: 2, podeMexer: false,
};
const juntar: Meta = { id: 'juntar', nome: 'Juntar R$ 30 mil', objetivo: 'juntar-valor', valorAlvo: 3000000, valorAtual: 0, prioridade: 3, podeMexer: false };

describe('Quanto você já guarda por mês', () => {
  it('muda a data "no seu ritmo" das Metas, sem mudar o Aporte do mês', () => {
    const padrao = rodar(ana, { metas: [juntar] }).metas.escada.find((m) => m.id === 'juntar')!;
    const devagar = rodar({ ...ana, guardaPorMes: 20000 }, { metas: [juntar] }).metas.escada.find((m) => m.id === 'juntar')!;
    expect(devagar.aporte).toBe(padrao.aporte);
    expect(devagar.dataNoRitmo! > padrao.dataNoRitmo!).toBe(true);
  });

  it('guardar zero não trava as datas: vale a Sobra', () => {
    const zero = rodar({ ...ana, guardaPorMes: 0 }, { metas: [juntar] }).metas.escada.find((m) => m.id === 'juntar')!;
    const padrao = rodar(ana, { metas: [juntar] }).metas.escada.find((m) => m.id === 'juntar')!;
    expect(zero.dataNoRitmo).toBe(padrao.dataNoRitmo);
  });

  it('guardar mais que a Sobra adianta a data', () => {
    const rapido = rodar({ ...ana, guardaPorMes: 300000 }, { metas: [viagem] }).metas.escada.find((m) => m.id === 'viagem')!;
    const padrao = rodar(ana, { metas: [viagem] }).metas.escada.find((m) => m.id === 'viagem')!;
    expect(rapido.dataNoRitmo! <= padrao.dataNoRitmo!).toBe(true);
  });
});

const cartao: Divida = { id: 'd1', nome: 'Cartão', tipo: 'cartao-rotativo', saldo: 300000, jurosMensal: 0.12, parcela: 20000, emAtraso: false };

describe('Quanto paga além das parcelas', () => {
  it('usa o que a pessoa disse em vez da Sobra e acelera a quitação', () => {
    const semExtra = analisarDividas([cartao], 0, 400000, 0)!;
    const comExtra = analisarDividas([cartao], 0, 400000, 50000)!;
    expect(comExtra.avalanche.meses!).toBeLessThan(semExtra.avalanche.meses ?? 999);
  });

  it('sem resposta, o extra continua sendo a Sobra', () => {
    expect(analisarDividas([cartao], 80000, 400000)).toEqual(analisarDividas([cartao], 80000, 400000, 80000));
  });

  it('o Motor repassa a resposta do Onboarding', () => {
    const base = onboarding({ ...ana, dividas: [cartao] });
    const a = rodar({ ...base, pagaAlemDasParcelas: 0 }).dividas!;
    const b = rodar({ ...base, pagaAlemDasParcelas: 100000 }).dividas!;
    expect(b.avalanche.meses!).toBeLessThan(a.avalanche.meses ?? 999);
  });
});

describe('Perfil de investidor', () => {
  it('quem venderia na queda é conservador, não importa o resto', () => {
    expect(perfilDeInvestidorDe({ tolerancia: 'vende', prazo: 'mais-de-5-anos', experiencia: 'bastante' })).toBe('conservador');
  });

  it('as 3 respostas somam para moderado ou arrojado', () => {
    expect(perfilDeInvestidorDe({ tolerancia: 'espera', prazo: 'de-2-a-5-anos', experiencia: 'pouca' })).toBe('moderado');
    expect(perfilDeInvestidorDe({ tolerancia: 'compra-mais', prazo: 'mais-de-5-anos', experiencia: 'bastante' })).toBe('arrojado');
  });

  it('a sugestão fala de tipos de produto por prazo, nunca de banco ou ativo específico', () => {
    const s = sugerirInvestimento({ tolerancia: 'espera', prazo: 'ate-2-anos', experiencia: 'nenhuma' }, true);
    expect(s.produto).toMatch(/pós-fixad/i);
    expect(JSON.stringify(s)).not.toMatch(/nubank|itaú|bradesco|petrobras|bitcoin/i);
  });

  it('prazo longo e perfil arrojado separa uma parcela para fundos de índice', () => {
    const s = sugerirInvestimento({ tolerancia: 'compra-mais', prazo: 'mais-de-5-anos', experiencia: 'bastante' }, true);
    expect(s.produto).toMatch(/índice/i);
    const conservador = sugerirInvestimento({ tolerancia: 'vende', prazo: 'mais-de-5-anos', experiencia: 'pouca' }, true);
    expect(conservador.produto).not.toMatch(/índice/i);
  });

  it('com a reserva incompleta, o primeiro passo é completar a reserva', () => {
    const s = sugerirInvestimento({ tolerancia: 'espera', prazo: 'de-2-a-5-anos', experiencia: 'pouca' }, false);
    expect(s.primeiroPasso).toMatch(/reserva/i);
    expect(s.liberado).toBe(false);
  });

  it('o Motor devolve a sugestão só quando o objetivo é investir e o perfil foi respondido', () => {
    const perfil = { tolerancia: 'espera' as const, prazo: 'de-2-a-5-anos' as const, experiencia: 'pouca' as const };
    expect(rodar({ ...ana, objetivos: ['investir'], perfilDeInvestidor: perfil }).investimento).not.toBeNull();
    expect(rodar({ ...ana, objetivos: ['investir'] }).investimento).toBeNull();
    expect(rodar({ ...ana, objetivos: ['reserva'], perfilDeInvestidor: perfil }).investimento).toBeNull();
  });
});
