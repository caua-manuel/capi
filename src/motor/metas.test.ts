import { describe, expect, it } from 'vitest';
import type { Lancamento } from '../dominio/lancamento';
import type { Meta } from '../dominio/meta';
import { aporteNecessario, compararCompra, metaDeAposentadoria, metaDeViagem, testeDeMorarSozinho } from './metas';
import { ana, bruno, onboarding, rodar } from './teste/pessoas';
import { PARAMETROS_PADRAO } from './parametros';

const meta = (parcial: Partial<Meta> & Pick<Meta, 'id' | 'nome' | 'valorAlvo'>): Meta => ({
  objetivo: 'juntar-valor', valorAtual: 0, prioridade: 2, podeMexer: false, ...parcial,
});
const viagem = meta({ id: 'viagem', nome: 'Viagem', objetivo: 'viagem', valorAlvo: 600000, dataAlvo: '2027-10', prioridade: 2 });
const vinteMil = meta({ id: 'vinte', nome: 'Juntar R$ 20 mil', valorAlvo: 2000000, prioridade: 3 });

let seq = 0;
const gasto = (valor: number, categoriaId: string, data: string): Lancamento => ({
  id: `m${++seq}`, valor, loja: 'Loja', categoriaId, data, origem: 'manual', criadoEm: `${data}T12:00:00Z`,
});

describe('Aporte mensal de uma Meta', () => {
  it('até 12 meses o Aporte é sem rendimento: (Meta − valor atual) ÷ meses', () => {
    // Viagem de R$ 6.000 em out/2027, a partir de nov/2026: 11 meses → ~R$ 545
    expect(aporteNecessario(600000, 0, 11, PARAMETROS_PADRAO.rendimentoMensalConservador)).toBe(54546);
  });

  it('acima de 12 meses o Aporte usa o rendimento conservador da tabela de Parâmetros', () => {
    const r = PARAMETROS_PADRAO.rendimentoMensalConservador;
    const esperado = (2000000 * r) / ((1 + r) ** 36 - 1);
    expect(aporteNecessario(2000000, 0, 36, r)).toBe(Math.ceil(esperado));
    expect(aporteNecessario(2000000, 0, 36, r)).toBeLessThan(2000000 / 36);
  });

  it('o valor atual rende até a data e diminui o Aporte', () => {
    const r = PARAMETROS_PADRAO.rendimentoMensalConservador;
    const esperado = ((1000000 - 300000 * (1 + r) ** 24) * r) / ((1 + r) ** 24 - 1);
    expect(aporteNecessario(1000000, 300000, 24, r)).toBe(Math.ceil(esperado));
  });

  it('Meta já alcançada não pede Aporte', () => {
    expect(aporteNecessario(100000, 150000, 10, 0.008)).toBe(0);
  });
});

describe('Escada de Degraus', () => {
  it('ordena colchão, dívida cara, reserva, metas com data e longo prazo', () => {
    const { metas } = rodar(onboarding({ ...bruno, guardado: { valor: 10000, onde: 'conta' } }), { metas: [vinteMil, viagem] });
    expect(metas.escada.map((m) => m.degrau)).toEqual([1, 2, 3, 4, 5]);
    expect(metas.escada.map((m) => m.nome)).toEqual(['Colchão de 1 mês', 'Dívida cara', 'Reserva de 12 meses', 'Viagem', 'Juntar R$ 20 mil']);
  });

  it('sem dívida acima de 2% ao mês não existe o Degrau da dívida cara', () => {
    const { metas } = rodar(ana, { metas: [viagem] });
    expect(metas.escada.map((m) => m.degrau)).toEqual([1, 3, 4]);
  });

  it('o colchão de 1 mês fica feito quando o guardado cobre 1 mês de custo de vida', () => {
    // Ana: 5.000 guardados, custo de vida 1.980
    expect(rodar(ana).metas.escada[0]).toMatchObject({ nome: 'Colchão de 1 mês', alvo: 198000, atual: 198000, feita: true });
  });

  it('a Reserva conta o guardado e mira os meses recomendados', () => {
    expect(rodar(ana).metas.escada.find((m) => m.degrau === 3)).toMatchObject({ alvo: 6 * 198000, atual: 500000, feita: false });
  });

  it('metas com data recebem o Aporte mínimo desde já; o resto vai para o degrau de baixo', () => {
    // Hoje 10/12/2026; viagem out/2027 = 10 meses → R$ 600/mês. Sobra 2.020 → 1.420 para a Reserva.
    const { metas } = rodar(ana, { metas: [viagem, vinteMil] });
    const porNome = (n: string) => metas.escada.find((m) => m.nome.startsWith(n))!;
    expect(porNome('Viagem').aporte).toBe(60000);
    expect(porNome('Reserva').aporte).toBe(142000);
    expect(porNome('Juntar').aporte).toBe(0);
    expect(metas.aporteTotal).toBe(202000);
    expect(metas.disponivel).toBe(202000);
  });

  it('a data provável no seu ritmo sai do Aporte de cada mês', () => {
    // Reserva: faltam 6.880 a R$ 1.420/mês, rendendo → 5 meses contando dezembro → abr/2027
    expect(rodar(ana, { metas: [viagem] }).metas.escada.find((m) => m.degrau === 3)!.dataNoRitmo).toBe('2027-04');
  });

  it('longo prazo só começa depois da Reserva', () => {
    const { metas } = rodar(ana, { metas: [vinteMil] });
    const vinte = metas.escada.find((m) => m.degrau === 5)!;
    const reserva = metas.escada.find((m) => m.degrau === 3)!;
    expect(vinte.aporte).toBe(0);
    expect(vinte.dataNoRitmo! > reserva.dataNoRitmo!).toBe(true);
  });

  it('longo prazo mostra quanto por mês para 3, 5 e 8 anos', () => {
    const vinte = rodar(ana, { metas: [vinteMil] }).metas.escada.find((m) => m.degrau === 5)!;
    const r = PARAMETROS_PADRAO.rendimentoMensalConservador;
    expect(vinte.aportePorPrazo).toEqual({
      tresAnos: aporteNecessario(2000000, 0, 36, r), cincoAnos: aporteNecessario(2000000, 0, 60, r), oitoAnos: aporteNecessario(2000000, 0, 96, r),
    });
  });
});

describe('Quando as Metas não cabem na Sobra', () => {
  const apertada = onboarding({ ...ana, variaveis: { essencial: 180000, estiloDeVida: 150000 } });
  const notebook = meta({ id: 'note', nome: 'Notebook', objetivo: 'comprar', valorAlvo: 300000, dataAlvo: '2027-03', prioridade: 3 });

  it('mostra as 3 saídas na ordem: adiar, reduzir e cortar', () => {
    const { metas } = rodar(apertada, { metas: [viagem, notebook] });
    expect(metas.naoCabe).toBe(true);
    expect(metas.saidas.map((s) => s.tipo)).toEqual(['adiar', 'reduzir', 'cortar']);
  });

  it('adiar sugere a Meta de menor prioridade e uma data em que ela cabe', () => {
    const adiar = rodar(apertada, { metas: [viagem, notebook] }).metas.saidas.find((s) => s.tipo === 'adiar')!;
    expect(adiar.metaId).toBe('note');
    expect(adiar.novaData! > '2027-03').toBe(true);
  });

  it('cortar mostra o valor que dá para liberar', () => {
    const cortar = rodar(apertada, { metas: [viagem, notebook] }).metas.saidas.find((s) => s.tipo === 'cortar')!;
    expect(cortar.valor).toBeGreaterThan(0);
  });

  it('nunca sugere tirar dinheiro da Reserva', () => {
    for (const s of rodar(apertada, { metas: [viagem, notebook] }).metas.saidas) {
      expect(s.metaId ?? '').not.toMatch(/reserva|colchao/);
      expect(s.texto.toLowerCase()).not.toContain('reserva');
    }
  });

  it('quando cabem, não há saídas', () => {
    const { metas } = rodar(ana, { metas: [viagem] });
    expect(metas.naoCabe).toBe(false);
    expect(metas.saidas).toEqual([]);
  });
});

describe('Duas datas: no seu ritmo e com os cortes sugeridos', () => {
  it('cortar o que passa dos Tetos de Estilo de vida adianta a Reserva', () => {
    const lancamentos = ['2026-09-10', '2026-10-10', '2026-11-10'].flatMap((d) => [gasto(200000, 'delivery', d), gasto(40000, 'mercado', d)]);
    const { metas } = rodar(ana, { lancamentos });
    const reserva = metas.escada.find((m) => m.degrau === 3)!;
    expect(metas.cortesSugeridos).toBeGreaterThan(0);
    expect(reserva.dataComCortes! < reserva.dataNoRitmo!).toBe(true);
  });

  it('sem nada para cortar as duas datas são iguais', () => {
    const reserva = rodar(onboarding({ ...ana, variaveis: { essencial: 80000, estiloDeVida: 50000 } })).metas.escada.find((m) => m.degrau === 3)!;
    expect(reserva.dataComCortes).toBe(reserva.dataNoRitmo);
  });
});

describe('Perguntas extras de cada objetivo', () => {
  it('viagem soma 15% de margem ao custo estimado', () => {
    expect(metaDeViagem({ custo: 500000 }).valorAlvo).toBe(575000);
  });

  it('aposentadoria mira a renda desejada × 12 ÷ 4%', () => {
    expect(metaDeAposentadoria({ rendaDesejada: 500000 }).valorAlvo).toBe(150000000);
  });

  it('comprar parcelado mostra os juros totais em relação a pagar à vista', () => {
    expect(compararCompra({ preco: 300000, parcelas: 12, valorDaParcela: 30000 })).toEqual({ totalParcelado: 360000, jurosTotais: 60000 });
  });

  it('morar sozinho testa se o novo custo cabe em 50% da renda', () => {
    expect(testeDeMorarSozinho({ custoMensalNovo: 180000, renda: 400000 })).toEqual({ cabe: true, limite: 200000 });
    expect(testeDeMorarSozinho({ custoMensalNovo: 250000, renda: 400000 }).cabe).toBe(false);
  });
});
