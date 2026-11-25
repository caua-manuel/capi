import type { Aviso } from './avisos';
import type { Centavos } from './dinheiro';

/** Para onde a figurinha leva quando a pessoa toca nela. `novo-gasto` abre o lançamento rápido. */
export type DestinoDaCapi = 'fatura' | 'metas' | 'calendario' | 'assinaturas' | 'checkin' | 'fixos' | 'posso-comprar' | 'novo-gasto' | 'diagnostico' | 'dia-do-pagamento';

export interface CapiDoDia {
  /** Nome da figurinha; o arquivo é `public/capi/dia-<figurinha>.png`. */
  figurinha: string;
  frase: string;
  destino: DestinoDaCapi;
}

export interface EntradaDaCapiDoDia {
  /** AAAA-MM-DD */
  hoje: string;
  avisos: readonly Aviso[];
  /** Quanto ainda pode gastar no mês, quando já há Plano. */
  aindaPodeGastar?: Centavos;
}

/** Frases sem número: o valor real fica nos cartões, e o Modo discreto não vaza. */
const SORTEIO: readonly CapiDoDia[] = [
  { figurinha: 'dinossauro', frase: 'Capi acordou monstra hoje: bora olhar o delivery com calma?', destino: 'fatura' },
  { figurinha: 'pijama-porquinho', frase: 'Dia de porquinho: cada real guardado conta.', destino: 'metas' },
  { figurinha: 'boia', frase: 'Capi de boa: sua semana está caminhando no plano.', destino: 'checkin' },
  { figurinha: 'praia', frase: 'Sonhando com a viagem: cada aporte aproxima o embarque.', destino: 'metas' },
  { figurinha: 'terno', frase: 'Capi executiva: que tal revisar seus fixos?', destino: 'fixos' },
  { figurinha: 'anjo', frase: 'Hoje é dia de passar longe da compra por impulso.', destino: 'posso-comprar' },
  { figurinha: 'estrelas', frase: 'Mês dentro do plano até aqui. Bonito de ver.', destino: 'checkin' },
  { figurinha: 'academia', frase: 'Treinando o hábito: lançar rápido todo dia.', destino: 'novo-gasto' },
  { figurinha: 'coracao', frase: 'Cuidar do dinheiro também é cuidar de você.', destino: 'diagnostico' },
  { figurinha: 'grafico', frase: 'No seu ritmo, as metas chegam. Olha a data de cada uma.', destino: 'metas' },
  { figurinha: 'cofrinho', frase: 'Dinheiro salvo vira aporte com 1 toque.', destino: 'metas' },
];

const diaDaSemana = (data: string) => new Date(`${data}T12:00:00Z`).getUTCDay();

function porSituacao(e: EntradaDaCapiDoDia): CapiDoDia | null {
  const tem = (tipo: Aviso['tipo']) => e.avisos.some((a) => a.tipo === tipo);
  const delivery = e.avisos.some((a) => (a.tipo === 'teto-80' || a.tipo === 'teto-estourado') && a.categoriaId === 'delivery');
  if (delivery) return { figurinha: 'hamburguer', frase: 'Delivery chegando perto do teto: vale olhar a semana com calma.', destino: 'fatura' };
  if (tem('meta-perto')) return { figurinha: 'festa-chapeu', frase: 'Meta pertinho. Toda meta batida merece festa.', destino: 'metas' };
  if (tem('anual-chegando')) return { figurinha: 'presente', frase: 'Um gasto anual vem aí: a Caixinha está pronta?', destino: 'calendario' };
  if (tem('assinatura-chegando')) return { figurinha: 'terno', frase: 'Assinatura chegando: ainda usa? Vale revisar.', destino: 'assinaturas' };
  if (e.aindaPodeGastar !== undefined && e.aindaPodeGastar < 0) {
    return { figurinha: 'bateria-fraca', frase: 'Mês apertado. Sem culpa: dá para ajustar a próxima semana.', destino: 'metas' };
  }
  if (diaDaSemana(e.hoje) === 0) return { figurinha: 'cama', frase: 'Domingo é dia de check-in, sem pressa.', destino: 'checkin' };
  return null;
}

/** A Capi do dia: a situação manda; o sorteio, pelo dia do ano, só entra quando não há nada a dizer. */
export function capiDoDia(e: EntradaDaCapiDoDia): CapiDoDia {
  const situacao = porSituacao(e);
  if (situacao) return situacao;
  const [a, m, d] = e.hoje.split('-').map(Number) as [number, number, number];
  const diaDoAno = Math.floor((Date.UTC(a, m - 1, d) - Date.UTC(a, 0, 0)) / 86400000);
  return SORTEIO[diaDoAno % SORTEIO.length] ?? SORTEIO[0]!;
}
