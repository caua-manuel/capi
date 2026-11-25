import type { Aviso } from '../motor/avisos';

export interface CapiDoDia {
  /** Arquivo em public/capi/. */
  imagem: string;
  frase: string;
}

/** Frases sem número: o valor real fica nos cartões, e o Modo discreto não vaza. */
const SORTEIO: readonly CapiDoDia[] = [
  { imagem: 'dia-dinossauro.png', frase: 'Capi acordou monstra hoje: bora olhar o delivery com calma?' },
  { imagem: 'dia-pijama-porquinho.png', frase: 'Dia de porquinho: cada real guardado conta.' },
  { imagem: 'dia-boia.png', frase: 'Capi de boa: sua semana está caminhando no plano.' },
  { imagem: 'dia-praia.png', frase: 'Sonhando com a viagem: cada aporte aproxima o embarque.' },
  { imagem: 'dia-terno.png', frase: 'Capi executiva: que tal revisar seus fixos?' },
  { imagem: 'dia-anjo.png', frase: 'Hoje é dia de passar longe da compra por impulso.' },
  { imagem: 'dia-bateria-fraca.png', frase: 'Cansou? Lança o gasto em 2 toques e pronto.' },
  { imagem: 'dia-estrelas.png', frase: 'Mês dentro do plano até aqui. Bonito de ver.' },
  { imagem: 'dia-academia.png', frase: 'Treinando o hábito: lançar rápido todo dia.' },
  { imagem: 'dia-coracao.png', frase: 'Cuidar do dinheiro também é cuidar de você.' },
  { imagem: 'dia-grafico.png', frase: 'No seu ritmo, as metas chegam. Olha a data de cada uma.' },
  { imagem: 'dia-cofrinho.png', frase: 'Dinheiro salvo vira aporte com 1 toque.' },
];

export interface EntradaDaCapiDoDia {
  /** AAAA-MM-DD. */
  hoje: string;
  avisos: readonly Aviso[];
  /** Quanto ainda pode gastar no mês, quando já há Plano. */
  aindaPodeGastar?: number;
}

function porSituacao(e: EntradaDaCapiDoDia): CapiDoDia | null {
  const tem = (tipo: Aviso['tipo']) => e.avisos.some((a) => a.tipo === tipo);
  const delivery = e.avisos.some((a) => (a.tipo === 'teto-80' || a.tipo === 'teto-estourado') && a.categoriaId === 'delivery');
  if (delivery) return { imagem: 'dia-hamburguer.png', frase: 'Delivery chegando perto do teto: vale olhar a semana com calma.' };
  if (tem('meta-perto')) return { imagem: 'dia-festa-chapeu.png', frase: 'Meta pertinho. Toda meta batida merece festa.' };
  if (tem('anual-chegando')) return { imagem: 'dia-presente.png', frase: 'Um gasto anual vem aí: a Caixinha está pronta?' };
  if (tem('assinatura-chegando')) return { imagem: 'dia-terno.png', frase: 'Assinatura chegando: ainda usa? Vale revisar.' };
  if (e.aindaPodeGastar !== undefined && e.aindaPodeGastar < 0) {
    return { imagem: 'dia-bateria-fraca.png', frase: 'Mês apertado. Sem culpa: dá para ajustar a próxima semana.' };
  }
  if (new Date(`${e.hoje}T12:00:00`).getDay() === 0) return { imagem: 'dia-cama.png', frase: 'Domingo é dia de check-in, sem pressa.' };
  return null;
}

/**
 * A Capi do dia: a situação manda; o sorteio só entra quando não há nada a dizer.
 * `trocas` é quantas vezes a pessoa tocou na figurinha hoje.
 */
export function capiDoDia(e: EntradaDaCapiDoDia, trocas = 0): CapiDoDia {
  const situacao = porSituacao(e);
  if (situacao && trocas === 0) return situacao;
  const dia = Number(e.hoje.slice(8, 10));
  return SORTEIO[(dia + trocas) % SORTEIO.length] ?? SORTEIO[0]!;
}
