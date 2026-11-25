import type { ReactNode } from 'react';
import type { Categoria } from '../dominio/categorias';
import type { Aviso } from '../motor/avisos';
import type { Dica, TipoDeDica } from '../motor/dicas';
import { Valor } from '../telas/discreto';
import { nomeDoMes } from '../telas/formato';
import { Icone } from './Icone';

const diasAte = (n: number) => (n === 1 ? 'Amanhã' : `Em ${n} dias`);

/** Texto do Aviso: direto, com número e sem culpa. Os números vêm do Motor. */
function textoDoAviso(a: Aviso, nome: (id: string) => string, hoje: string): ReactNode {
  switch (a.tipo) {
    case 'teto-estourado':
      return <>Passou <Valor centavos={a.excesso} /> em {nome(a.categoriaId)}. Dá para ajustar de outra categoria.</>;
    case 'teto-80':
      return <>{nome(a.categoriaId)}: <Valor centavos={a.gasto} /> de <Valor centavos={a.teto} />. Faltam {a.diasRestantes} dias.</>;
    case 'ritmo-diario':
      return <>Para fechar no plano: até <Valor centavos={a.porDia} />/dia nesta semana.</>;
    case 'assinatura-chegando': {
      const dias = Math.round((Date.parse(a.data) - Date.parse(hoje)) / 86400000);
      return <>{diasAte(dias)}: {a.loja} <Valor centavos={a.valor} />. Ainda usa?</>;
    }
    case 'anual-chegando':
      return <>{a.nome} em {nomeDoMes(a.data.slice(0, 7))}: <Valor centavos={a.valor} />. A Caixinha tem <Valor centavos={a.caixinha} />.</>;
    case 'meta-perto':
      return <>{a.nome} em {a.marco}%. Faltam <Valor centavos={a.falta} />.</>;
    case 'sumiu':
      return a.aindaPodeGastar >= 0
        ? <>Sua semana em 1 minuto: ainda dá para gastar <Valor centavos={a.aindaPodeGastar} /> no mês.</>
        : <>Sua semana em 1 minuto: o mês passou <Valor centavos={-a.aindaPodeGastar} /> do plano. Bora ajustar a próxima semana.</>;
  }
}

export function ListaDeAvisos({ avisos, categorias, hoje }: { avisos: readonly Aviso[]; categorias: readonly Categoria[]; hoje: string }) {
  if (avisos.length === 0) return null;
  const nome = (id: string) => categorias.find((c) => c.id === id)?.nome ?? 'Outros';
  return (
    <ul className="lista-avisos" aria-label="Avisos">
      {avisos.map((a) => (
        <li key={a.chave} className="aviso">
          <span className="aviso-sino"><Icone nome="sino" tamanho={16} /></span>
          <span>{textoDoAviso(a, nome, hoje)}</span>
        </li>
      ))}
    </ul>
  );
}

const TEXTO_DA_DICA: Record<TipoDeDica, string> = {
  'comida-fora': 'Comida fora pesando: teto semanal em vez de mensal, 1 dia de delivery fixo e 2 refeições rápidas prontas em casa.',
  'compras-pequenas': 'Muitas compras pequenas: regra das 24 horas para o que não estava planejado.',
  'servicos-parecidos': 'Serviços parecidos: fique com os que usa toda semana e alterne streaming por mês.',
  'assinatura-dolar': 'Assinatura em dólar: veja se existe plano em reais ou anual. Toda compra internacional paga IOF.',
  'assinatura-duplicada': 'Cobrança repetida: confira a lista de assinaturas do celular (iPhone: Ajustes → seu nome → Assinaturas).',
  combustivel: 'Muitos abastecimentos pequenos: encher o tanque em posto com cashback e calibrar os pneus.',
  'dinheiro-parado': 'Dinheiro parado na conta ou na poupança: a reserva rende mais no Tesouro Selic ou em CDB com liquidez diária de 100% do CDI ou mais.',
  'fatura-crescendo': 'A fatura cresceu 3 meses seguidos: o teto do próximo mês é a média dos 3 últimos menos 10%.',
  rotativo: 'Dívida no rotativo: troque já por um parcelamento ou empréstimo com juros menores e nunca pague só o mínimo.',
  caixinha: 'Gastos anuais: separe 1/12 por mês numa Caixinha para o mês não estourar.',
};

export function ListaDeDicas({ dicas }: { dicas: readonly Dica[] }) {
  if (dicas.length === 0) return null;
  return (
    <section className="cartao" style={{ margin: '12px 0 0' }} aria-label="Dicas">
      <h2 className="titulo">Dicas para você</h2>
      <ul className="lista-categorias">
        {dicas.map((d) => (
          <li key={d.tipo} style={{ padding: '10px 0' }}>
            <p style={{ margin: 0 }}>{TEXTO_DA_DICA[d.tipo]}</p>
            <p className="rotulo" style={{ margin: '4px 0 0' }}>
              {d.tipo === 'caixinha' ? 'Separar' : d.tipo === 'dinheiro-parado' ? 'Rende a mais' : 'Economia'}: <Valor centavos={d.economiaPorMes} semCentavos />/mês
              {d.tetoSugerido !== undefined && <> · teto sugerido: <Valor centavos={d.tetoSugerido} semCentavos /></>}
              {d.metaNome && d.mesesAntes ? <> · {d.metaNome} chega {d.mesesAntes === 1 ? '1 mês' : `${d.mesesAntes} meses`} antes</> : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
