import type { PerfilDeInvestidor, PrazoDoDinheiro } from '../dominio/onboarding';

export type PerfilDoInvestidor = 'conservador' | 'moderado' | 'arrojado';

export interface SugestaoDeInvestimento {
  perfil: PerfilDoInvestidor;
  prazo: PrazoDoDinheiro;
  /** O tipo de produto para esse prazo, em palavras simples. Nunca um banco ou ativo específico. */
  produto: string;
  explicacao: string;
  primeiroPasso: string;
  /** Falso enquanto a reserva não está completa: ela vem primeiro. */
  liberado: boolean;
}

const PONTOS = {
  tolerancia: { vende: 0, espera: 1, 'compra-mais': 2 },
  prazo: { 'ate-2-anos': 0, 'de-2-a-5-anos': 1, 'mais-de-5-anos': 2 },
  experiencia: { nenhuma: 0, pouca: 1, bastante: 2 },
} as const;

/** Quem venderia na queda é conservador. Nos demais casos, as 3 respostas somam: 0–2, 3–4 e 5–6. */
export function perfilDeInvestidorDe(p: PerfilDeInvestidor): PerfilDoInvestidor {
  if (p.tolerancia === 'vende') return 'conservador';
  const soma = PONTOS.tolerancia[p.tolerancia] + PONTOS.prazo[p.prazo] + PONTOS.experiencia[p.experiencia];
  return soma <= 2 ? 'conservador' : soma <= 4 ? 'moderado' : 'arrojado';
}

/** O primeiro passo para começar a investir, por tipo de produto e prazo (docs/motor-financeiro.md). */
export function sugerirInvestimento(p: PerfilDeInvestidor, reservaCompleta: boolean): SugestaoDeInvestimento {
  const perfil = perfilDeInvestidorDe(p);
  let produto: string;
  let explicacao: string;
  if (p.prazo === 'ate-2-anos') {
    produto = 'Renda fixa pós-fixada com liquidez';
    explicacao = 'Rende acompanhando os juros do país e você consegue resgatar quando precisar, sem susto no valor.';
  } else if (p.prazo === 'de-2-a-5-anos') {
    produto = 'Renda fixa prefixada ou atrelada à inflação (IPCA+)';
    explicacao = 'Você trava uma taxa para um prazo certo. Resgatar antes do vencimento pode render menos.';
  } else if (perfil === 'conservador') {
    produto = 'Renda fixa atrelada à inflação (IPCA+) de prazo longo';
    explicacao = 'Protege o poder de compra no longo prazo, com a data de vencimento como aliada.';
  } else {
    produto = 'Renda fixa IPCA+ de prazo longo e uma parcela em fundos de índice';
    explicacao = 'A renda fixa dá a base; os fundos de índice (renda variável) entram só com o que você aguenta ver oscilar.';
  }
  const primeiroPasso = reservaCompleta
    ? 'Separe um valor fixo por mês e comece pequeno, no tipo de produto do seu prazo.'
    : 'Antes de investir, complete a reserva de emergência: ela vem primeiro e fica em um lugar de resgate fácil.';
  return { perfil, prazo: p.prazo, produto, explicacao, primeiroPasso, liberado: reservaCompleta };
}
