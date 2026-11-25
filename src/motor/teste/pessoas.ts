// Pessoas fictícias para os testes do Motor. Nenhum dado real.
import { CATEGORIAS_PADRAO } from '../../dominio/categorias';
import type { RespostasDoOnboarding } from '../../dominio/onboarding';
import { calcular, type EntradaDoMotor } from '../index';
import { fixosDoOnboarding } from '../fixos';
import { PARAMETROS_PADRAO } from '../parametros';

const base: RespostasDoOnboarding = {
  renda: { valor: 0, tipo: 'fixa', ultimosMeses: [] },
  trabalho: 'clt',
  moradia: { comQuem: 'sozinho', valor: 0 },
  fixos: [],
  variaveis: { essencial: 0, estiloDeVida: 0 },
  anuais: [],
  dividas: [],
  guardado: { valor: 0, onde: 'conta' },
  objetivos: [],
  estimado: [],
  respondidoEm: '2026-11-24',
};

export function onboarding(parcial: Partial<RespostasDoOnboarding>): RespostasDoOnboarding {
  return { ...base, ...parcial };
}

/** Ana: CLT, mora com a família, paga pouca moradia, guarda bem. */
export const ana = onboarding({
  renda: { valor: 400000, tipo: 'fixa', ultimosMeses: [] },
  trabalho: 'clt',
  moradia: { comQuem: 'familia', valor: 30000 },
  fixos: [
    { id: 'celular', nome: 'Celular', valor: 6000, categoriaId: 'casa-contas', dia: 10 },
    { id: 'academia', nome: 'Academia', valor: 12000, categoriaId: 'treino', dia: 5 },
  ],
  variaveis: { essencial: 80000, estiloDeVida: 70000 },
  guardado: { valor: 500000, onde: 'poupanca' },
  objetivos: ['viagem', 'reserva'],
});

/** Bruno: autônomo, renda muito variável, sozinho, com rotativo do cartão. */
export const bruno = onboarding({
  renda: { valor: 400000, tipo: 'varia-muito', ultimosMeses: [500000, 200000, 350000, 250000, 600000, 300000] },
  trabalho: 'pj-autonomo',
  moradia: { comQuem: 'sozinho', valor: 120000 },
  fixos: [{ id: 'internet', nome: 'Internet', valor: 10000, categoriaId: 'casa-contas', dia: 15 }],
  variaveis: { essencial: 60000, estiloDeVida: 50000 },
  dividas: [{ id: 'cartao', nome: 'Cartão', tipo: 'cartao-rotativo', saldo: 400000, jurosMensal: 0.12, parcela: 40000, emAtraso: false }],
  guardado: { valor: 0, onde: 'conta' },
  objetivos: ['quitar-dividas'],
});

/** Carla: servidora, sozinha, reserva completa, sobra alta. */
export const carla = onboarding({
  renda: { valor: 800000, tipo: 'fixa', ultimosMeses: [] },
  trabalho: 'servidor',
  moradia: { comQuem: 'sozinho', valor: 200000 },
  fixos: [{ id: 'plano', nome: 'Plano de saúde', valor: 50000, categoriaId: 'saude', dia: 1 }],
  variaveis: { essencial: 100000, estiloDeVida: 100000 },
  guardado: { valor: 1500000, onde: 'tesouro' },
  objetivos: ['investir'],
});

/** Monta a entrada do Motor com os Fixos do Onboarding, para o dia de hoje dos testes. */
export function entrada(respostas: RespostasDoOnboarding, extra: Partial<EntradaDoMotor> = {}): EntradaDoMotor {
  return {
    hoje: '2026-12-10',
    onboarding: respostas,
    fixos: fixosDoOnboarding(respostas, '2026-12'),
    categorias: [...CATEGORIAS_PADRAO],
    lancamentos: [],
    parametros: PARAMETROS_PADRAO,
    ...extra,
  };
}

export const rodar = (respostas: RespostasDoOnboarding, extra: Partial<EntradaDoMotor> = {}) => calcular(entrada(respostas, extra));
