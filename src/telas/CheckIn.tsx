import type { Checkin } from '../motor/checkin';
import type { Lancamento } from '../dominio/lancamento';
import type { PlacarDoMes } from '../motor/fechamento';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import { Icone } from '../componentes/Icone';
import { Valor } from './discreto';
import { nomeDoMes, rotuloDaData } from './formato';
import { navegar } from './rotas';

interface Props {
  checkin: Checkin;
  nomeDaCategoria: (id: string) => string;
  onEditar: (lancamento: Lancamento) => void;
  /** Dinheiro salvo do mês passado, que ainda pode virar Aporte. */
  salvoDoMesPassado: PlacarDoMes | null;
  aporteFeito: boolean;
  onVirarAporte: () => void;
}

export function CheckIn({ checkin, nomeDaCategoria, onEditar, salvoDoMesPassado, aporteFeito, onVirarAporte }: Props) {
  const { semanasNoPlano: semanas } = checkin;
  const aporte = salvoDoMesPassado?.aporteExtra;
  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Check-in" linha2="de domingo" onVoltar={() => navegar('inicio')} capi="capi-cha.png" />
      <Folha>
        <section className="cartao-gelo bloco-placar" aria-label="Sequência de semanas">
          <span className="num placar-numero">{semanas}</span>
          <span className="texto-2">
            {semanas === 0 ? 'semanas seguidas no plano: esta semana pode ser a primeira' : semanas === 1 ? 'semana seguida no plano' : 'semanas seguidas no plano'}
          </span>
        </section>

        <section className="cartao" style={{ margin: '12px 0 0' }} aria-label="Livre por categoria">
          <h2 className="titulo">Livre por categoria</h2>
          <p className="rotulo" style={{ margin: '2px 0 0' }}>
            {checkin.diasAteDomingo === 0 ? 'Até hoje, domingo.' : `Até domingo, ${checkin.diasAteDomingo === 1 ? 'amanhã' : `daqui a ${checkin.diasAteDomingo} dias`}.`}
          </p>
          {checkin.livrePorCategoria.length === 0 ? (
            <p className="texto-2" style={{ margin: '8px 0 0' }}>
              Os Tetos por Categoria aparecem depois do primeiro mês. Por enquanto: ainda pode gastar <b className="num"><Valor centavos={checkin.aindaPodeGastar} semCentavos /></b> no mês, cerca de <span className="num"><Valor centavos={checkin.porDia} semCentavos /></span> por dia.
            </p>
          ) : (
            <ul className="lista-divisao">
              {checkin.livrePorCategoria.slice(0, 6).map((c) => (
                <li key={c.categoriaId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{nomeDaCategoria(c.categoriaId)}</span>
                    <span className="num" style={{ fontWeight: 600 }}><Valor centavos={c.livreAteDomingo} semCentavos /></span>
                  </div>
                  <div className="barra-progresso" aria-hidden="true">
                    <div className={c.estado === 'estourado' ? 'ruim' : c.estado === 'atencao' ? 'atencao' : ''} style={{ width: `${Math.min(100, c.uso * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {checkin.semCategoria.length > 0 && (
          <section className="cartao" style={{ margin: '12px 0 0' }} aria-label="Gastos para confirmar">
            <h2 className="titulo">{checkin.semCategoria.length === 1 ? '1 gasto do Apple Pay sem categoria' : `${checkin.semCategoria.length} gastos do Apple Pay sem categoria`}</h2>
            <ul className="lista-categorias">
              {checkin.semCategoria.map((l) => (
                <li key={l.id}>
                  <button type="button" className="item-lancamento" onClick={() => onEditar(l)}>
                    <span className="item-texto">
                      <span className="item-loja">{l.loja}</span>
                      <span className="rotulo">{rotuloDaData(l.data)} · toque para escolher a categoria</span>
                    </span>
                    <span className="num item-valor"><Valor centavos={l.valor} /></span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {salvoDoMesPassado && aporte && (
          <section className="cartao" style={{ margin: '12px 0 0' }} aria-label="Dinheiro salvo">
            <div className="rotulo">Dinheiro salvo em {nomeDoMes(salvoDoMesPassado.mes)}</div>
            <div className="num titulo" style={{ fontSize: 24, marginTop: 2 }}><Valor centavos={aporte.valor} /></div>
            <button type="button" className="chip" style={{ marginTop: 10 }} aria-pressed={!aporteFeito} disabled={aporteFeito} onClick={onVirarAporte}>
              {aporteFeito ? 'Aporte feito' : `Virar aporte de ${aporte.metaNome}`}
            </button>
          </section>
        )}

        <div style={{ marginTop: 16 }}>
          <button type="button" className="botao-principal" onClick={() => navegar('inicio')}>
            Fechar check-in
            <span className="seta"><Icone nome="check" tamanho={18} traco={2} /></span>
          </button>
        </div>
      </Folha>
    </main>
  );
}
