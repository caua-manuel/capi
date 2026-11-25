import { useState } from 'react';
import { CampoDinheiro } from '../componentes/CampoDinheiro';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import { Icone } from '../componentes/Icone';
import type { Meta, Prioridade } from '../dominio/meta';
import type { Objetivo } from '../dominio/onboarding';
import type { Centavos } from '../motor/dinheiro';
import {
  compararCompra, metaDeAposentadoria, metaDeViagem, testeDeMorarSozinho, type MetaNaEscada, type PlanoDasMetas,
} from '../motor/metas';
import { Valor } from './discreto';
import type { Dica } from '../motor/dicas';
import { ListaDeDicas } from '../componentes/Avisos';
import type { SugestaoDeInvestimento } from '../motor/investir';
import { mesCurto } from './formato';
import { navegar } from './rotas';

const OBJETIVOS_DE_META: [Objetivo, string][] = [
  ['juntar-valor', 'Juntar um valor'], ['viagem', 'Viagem'], ['comprar', 'Comprar algo'], ['investir', 'Começar a investir'],
  ['morar-sozinho', 'Morar sozinho, casar ou filho'], ['aposentadoria', 'Aposentadoria'],
];

interface Props {
  plano: PlanoDasMetas;
  metas: readonly Meta[];
  renda: Centavos;
  temDividas: boolean;
  dicas: readonly Dica[];
  /** Sugestão por tipo de produto, quando o objetivo inclui investir. */
  investimento?: SugestaoDeInvestimento | null;
  onSalvar: (meta: Meta) => void;
  onApagar: (id: string) => void;
}

function NovaMeta({ renda, onSalvar, onCancelar }: { renda: Centavos; onSalvar: (m: Meta) => void; onCancelar: () => void }) {
  const [objetivo, setObjetivo] = useState<Objetivo>('juntar-valor');
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState<Centavos | null>(null);
  const [atual, setAtual] = useState<Centavos | null>(null);
  const [data, setData] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>(2);
  const [podeMexer, setPodeMexer] = useState(false);
  const [internacional, setInternacional] = useState(false);
  const [parcelas, setParcelas] = useState(0);
  const [valorDaParcela, setValorDaParcela] = useState<Centavos | null>(null);
  const [custoMensal, setCustoMensal] = useState<Centavos | null>(null);

  // O valor-alvo depende do objetivo: viagem ganha 15% de margem, aposentadoria vira patrimônio.
  const alvo = !valor ? 0 : objetivo === 'viagem' ? metaDeViagem({ custo: valor }).valorAlvo
    : objetivo === 'aposentadoria' ? metaDeAposentadoria({ rendaDesejada: valor }).valorAlvo : valor;
  const semData = objetivo === 'aposentadoria' || objetivo === 'investir';
  const valido = alvo > 0 && (semData || objetivo === 'juntar-valor' || data !== '');
  const nomePadrao = OBJETIVOS_DE_META.find(([o]) => o === objetivo)?.[1] ?? 'Meta';
  const rotuloDoValor = objetivo === 'viagem' ? 'Custo estimado da viagem' : objetivo === 'comprar' ? 'Preço à vista'
    : objetivo === 'aposentadoria' ? 'Renda por mês que você quer (valor de hoje)' : objetivo === 'morar-sozinho' ? 'Custo inicial (móveis, mudança, caução)' : 'Valor';

  return (
    <div className="cartao linha-form" style={{ margin: '12px 0 0' }}>
      <h2 className="titulo">Nova meta</h2>
      <div className="chips-livres">
        {OBJETIVOS_DE_META.map(([o, n]) => (
          <button key={o} type="button" className="chip" aria-pressed={objetivo === o} onClick={() => setObjetivo(o)}>{n}</button>
        ))}
      </div>
      <div className="campo"><input aria-label="Nome da meta" placeholder={objetivo === 'viagem' ? 'Destino' : nomePadrao} value={nome} onChange={(e) => setNome(e.target.value)} /></div>
      <CampoDinheiro id="valor-meta" rotulo={rotuloDoValor} valor={valor} onMudar={setValor} />
      {objetivo === 'viagem' && valor ? <p className="rotulo" style={{ margin: 0 }}>Com 15% de margem: <Valor centavos={alvo} />.</p> : null}
      {objetivo === 'aposentadoria' && valor ? <p className="rotulo" style={{ margin: 0 }}>Patrimônio para viver de renda (regra dos 4%): <Valor centavos={alvo} />.</p> : null}
      {objetivo === 'morar-sozinho' && (
        <>
          <CampoDinheiro id="custo-mensal" rotulo="Novo custo por mês (aluguel, contas)" valor={custoMensal} onMudar={setCustoMensal} />
          {custoMensal ? (() => {
            const t = testeDeMorarSozinho({ custoMensalNovo: custoMensal, renda });
            return <p className="rotulo" style={{ margin: 0 }}>{t.cabe ? 'Cabe' : 'Não cabe'} em 50% da sua renda (<Valor centavos={t.limite} />).</p>;
          })() : null}
        </>
      )}
      {objetivo === 'comprar' && (
        <div className="linha-dupla">
          <label className="rotulo">Parcelas (0 = à vista)
            <input className="seletor num" type="number" min={0} max={48} value={parcelas} onChange={(e) => setParcelas(Math.max(0, Number(e.target.value) || 0))} />
          </label>
          {parcelas > 0 && <CampoDinheiro id="parcela" rotulo="Valor da parcela" valor={valorDaParcela} onMudar={setValorDaParcela} />}
        </div>
      )}
      {objetivo === 'comprar' && valor && parcelas > 0 && valorDaParcela ? (() => {
        const c = compararCompra({ preco: valor, parcelas, valorDaParcela });
        return <p className="rotulo" style={{ margin: 0 }}>Parcelado sai <Valor centavos={c.totalParcelado} />: <Valor centavos={c.jurosTotais} /> de juros a mais do que guardar e pagar à vista.</p>;
      })() : null}
      {!semData && (
        <label className="rotulo">Para quando{objetivo === 'juntar-valor' ? ' (opcional)' : ''}
          <input className="seletor" type="month" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
      )}
      <CampoDinheiro id="atual-meta" rotulo="Quanto já tem para ela" valor={atual} onMudar={setAtual} />
      <div>
        <span className="rotulo">Prioridade</span>
        <div className="segmentado" role="radiogroup" aria-label="Prioridade" style={{ marginTop: 4 }}>
          {([1, 2, 3] as Prioridade[]).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={prioridade === p} onClick={() => setPrioridade(p)}>{['Alta', 'Média', 'Baixa'][p - 1]}</button>
          ))}
        </div>
      </div>
      {objetivo === 'viagem' && (
        <label className="linha-categoria"><span>Para fora do Brasil</span>
          <input type="checkbox" role="switch" className="interruptor" checked={internacional} onChange={(e) => setInternacional(e.target.checked)} />
        </label>
      )}
      <label className="linha-categoria"><span>Pode mexer antes da data</span>
        <input type="checkbox" role="switch" className="interruptor" checked={podeMexer} onChange={(e) => setPodeMexer(e.target.checked)} />
      </label>
      {objetivo === 'investir' && (
        <p className="rotulo" style={{ margin: 0 }}>
          Investir começa depois da Reserva completa. Por prazo: até 2 anos, pós-fixado com liquidez; de 2 a 5 anos, prefixado ou IPCA+; acima de 5 anos, IPCA+ longo e, para quem aceita oscilação, uma parte em fundos de índice.
        </p>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="chip" style={{ flex: 1 }} onClick={onCancelar}>Cancelar</button>
        <button type="button" className="chip" aria-pressed="true" style={{ flex: 1 }} disabled={!valido}
          onClick={() => onSalvar({
            id: `meta-${crypto.randomUUID()}`, nome: nome.trim() || nomePadrao, objetivo, valorAlvo: alvo, valorAtual: atual ?? 0,
            dataAlvo: !semData && data ? data : undefined, prioridade, podeMexer, internacional: objetivo === 'viagem' ? internacional : undefined,
          })}>Criar meta</button>
      </div>
    </div>
  );
}

function linhaDaData(m: MetaNaEscada): string {
  if (m.feita) return 'Feita';
  const ritmo = m.dataNoRitmo ? mesCurto(m.dataNoRitmo) : 'mais de 50 anos';
  if (m.degrau === 4) {
    const cortes = m.dataComCortes && m.dataComCortes !== m.dataNoRitmo ? ` · com cortes ${mesCurto(m.dataComCortes)}` : '';
    return `No seu ritmo ${ritmo}${cortes}`;
  }
  if (m.degrau === 5 && m.aporte === 0) return `Começa depois da Reserva · previsão ${ritmo}`;
  const cortes = m.dataComCortes && m.dataComCortes !== m.dataNoRitmo ? ` (com cortes ${mesCurto(m.dataComCortes)})` : '';
  return `Chega em ${ritmo}${cortes}`;
}

export function Metas({ plano, metas, renda, temDividas, dicas, investimento, onSalvar, onApagar }: Props) {
  const [criando, setCriando] = useState(false);
  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Suas metas" linha2="em ordem de prioridade" onVoltar={() => navegar('inicio')} capi="capi-dorme.png" />
      <Folha>
        <section className="cartao-gelo" style={{ margin: 0 }} aria-label="Resumo">
          <div className="coluna-gelo">
            <span className="rotulo">Guardar por mês</span>
            <span className="num valor-gelo"><Valor centavos={plano.naoCabe ? plano.necessario : plano.aporteTotal} semCentavos /></span>
          </div>
          <div className="coluna-gelo">
            <span className="rotulo">Sua sobra hoje</span>
            <span className="num valor-gelo"><Valor centavos={plano.disponivel} semCentavos /></span>
          </div>
        </section>

        {plano.naoCabe && (
          <section className="cartao" style={{ margin: '12px 0 0' }}>
            <h2 className="titulo">As metas não cabem na sobra</h2>
            <p className="rotulo" style={{ margin: '2px 0 8px' }}>Três saídas, nesta ordem:</p>
            <ul className="lista-sinais">
              {plano.saidas.map((s) => (
                <li key={s.tipo}>
                  {s.texto}
                  {s.novaData && <> Nova data: {mesCurto(s.novaData)}.</>}
                  {s.novoValor !== undefined && <> Novo valor: <Valor centavos={s.novoValor} semCentavos />.</>}
                  {s.valor !== undefined && <> Libera <Valor centavos={s.valor} semCentavos /> por mês.</>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <ol className="lista-metas">
          {plano.escada.map((m, i) => {
            const minha = metas.find((x) => x.id === m.id);
            return (
              <li key={m.id} className="cartao" style={{ margin: '12px 0 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                    <span className={m.feita ? 'numero-meta feita' : 'numero-meta'}>{m.feita ? <Icone nome="check" tamanho={16} traco={2.2} /> : i + 1}</span>
                    <span className="titulo" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.nome}{m.dataAlvo ? <span className="texto-2"> {mesCurto(m.dataAlvo)}</span> : null}</span>
                  </span>
                  {minha && (
                    <button type="button" className="botao-icone" aria-label={`Apagar ${m.nome}`} style={{ color: 'var(--bad)' }}
                      onClick={() => { if (window.confirm(`Apagar a meta "${m.nome}"?`)) onApagar(m.id); }}>
                      <Icone nome="lixo" tamanho={18} />
                    </button>
                  )}
                </div>
                <p className="num" style={{ margin: '8px 0 0' }}><Valor centavos={m.atual} semCentavos /> <span className="texto-2">de <Valor centavos={m.alvo} semCentavos /></span></p>
                <div className="barra-progresso" aria-hidden="true"><div style={{ width: `${m.progresso * 100}%` }} /></div>
                <p className="rotulo" style={{ margin: '8px 0 0' }}>
                  {m.aporte > 0 && <><Valor centavos={m.aporte} semCentavos />/mês · </>}{linhaDaData(m)}
                </p>
                {m.aportePorPrazo && (
                  <p className="rotulo" style={{ margin: '4px 0 0' }}>
                    Para chegar em 3 anos: <Valor centavos={m.aportePorPrazo.tresAnos} semCentavos />/mês · 5 anos: <Valor centavos={m.aportePorPrazo.cincoAnos} semCentavos /> · 8 anos: <Valor centavos={m.aportePorPrazo.oitoAnos} semCentavos />
                  </p>
                )}
                {m.degrau === 2 && temDividas && (
                  <button type="button" className="link" style={{ width: 'auto', marginTop: 4 }} onClick={() => navegar('dividas')}>Ver avalanche x bola de neve</button>
                )}
                {m.internacional && <p className="rotulo" style={{ margin: '4px 0 0' }}>Viagem para fora: compre a moeda aos poucos, para o câmbio não pesar de uma vez.</p>}
              </li>
            );
          })}
        </ol>

        {investimento && (
          <section className="cartao" style={{ margin: '12px 0 0' }} aria-label="Começar a investir">
            <h2 className="titulo">Começar a investir</h2>
            <p className="rotulo" style={{ margin: '2px 0 8px' }}>
              Seu perfil: {investimento.perfil} · prazo {investimento.prazo === 'ate-2-anos' ? 'até 2 anos' : investimento.prazo === 'de-2-a-5-anos' ? 'de 2 a 5 anos' : 'acima de 5 anos'}
            </p>
            <p style={{ margin: 0, fontWeight: 600 }}>{investimento.produto}</p>
            <p className="texto-2" style={{ margin: '4px 0 0' }}>{investimento.explicacao}</p>
            <p style={{ margin: '8px 0 0' }}>{investimento.primeiroPasso}</p>
            <p className="rotulo" style={{ margin: '8px 0 0', color: 'var(--tx3)' }}>
              Educativo, sem recomendar banco nem ativo. Antes de investir, compare taxas e prazos.
            </p>
          </section>
        )}
        <ListaDeDicas dicas={dicas} />

        {criando ? (
          <NovaMeta renda={renda} onSalvar={(m) => { onSalvar(m); setCriando(false); }} onCancelar={() => setCriando(false)} />
        ) : (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" className="chip chip-novo" onClick={() => setCriando(true)}>+ Nova meta</button>
            {metas.length > 0 && <button type="button" className="chip" onClick={() => navegar('ese')}>E se…</button>}
          </div>
        )}
        <p className="rotulo" style={{ textAlign: 'center', margin: '16px 8px 0', color: 'var(--tx3)' }}>
          O dinheiro vai para o degrau de baixo antes de subir; metas com data recebem a parte delas desde já. Plano educativo, não é recomendação de investimento.
        </p>
      </Folha>
    </main>
  );
}
