import type { Categoria } from '../dominio/categorias';
import type { Lancamento } from '../dominio/lancamento';
import { Icone } from '../componentes/Icone';
import type { Centavos } from '../motor/dinheiro';
import type { Plano } from '../motor/plano';
import type { PrevisaoDeFatura } from '../motor/previsao';
import type { Aviso } from '../motor/avisos';
import type { CompraEmEspera } from '../motor/compra';
import { ListaDeAvisos } from '../componentes/Avisos';
import { hoje } from './formato';
import { Valor, useModoDiscreto } from './discreto';
import { nomeDoMes, rotuloDaData, saudacao } from './formato';

interface Props {
  mes: string;
  lancamentos: Lancamento[];
  /** Todas as Categorias, inclusive as escondidas, para nomear Lançamentos antigos. */
  categorias: readonly Categoria[];
  onLancar: () => void;
  onEditar: (lancamento: Lancamento) => void;
  onAjustes: () => void;
  onAlternarDiscreto: () => void;
  /** Ainda não respondeu o Onboarding. */
  semPlano: boolean;
  onMontarPlano: () => void;
  /** Plano do Motor, quando o Onboarding já foi respondido. */
  plano: Plano | null;
  /** Barras de Metas para a home. */
  metas: MetaNaHome[];
  onMetas: () => void;
  previsao: PrevisaoDeFatura | null;
  onFatura: () => void;
  avisos: readonly Aviso[];
  /** Compras guardadas pela regra das 24 horas que já podem ser decididas. */
  comprasParaLembrar: readonly CompraEmEspera[];
  onResolverCompra: (id: string) => void;
  onPossoComprar: () => void;
}

export interface MetaNaHome {
  nome: string;
  atual: Centavos;
  progresso: number;
  /** "out/2027", quando houver data prevista. */
  data?: string;
}

/** Hora do Lançamento mais recente: até quando os números valem. */
function atualizadoEm(lancamentos: readonly Lancamento[]): string | null {
  const ultimo = lancamentos.reduce<string | null>((m, l) => (!m || l.criadoEm > m ? l.criadoEm : m), null);
  if (!ultimo) return null;
  const d = new Date(ultimo);
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}, ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

export function Inicio({ mes, lancamentos, categorias, onLancar, onEditar, onAjustes, onAlternarDiscreto, semPlano, onMontarPlano, plano, metas, onMetas, previsao, onFatura, avisos, comprasParaLembrar, onResolverCompra, onPossoComprar }: Props) {
  const discreto = useModoDiscreto();
  const total = lancamentos.reduce((soma, l) => soma + l.valor, 0);
  const nomeDaCategoria = (id: string) => categorias.find((c) => c.id === id)?.nome ?? 'Outros';
  const base = import.meta.env.BASE_URL;

  return (
    <>
      <main className="tela">
        <header style={{ padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src={`${base}apple-touch-icon.png`} alt="Capi" width={44} height={44}
            style={{ borderRadius: 11, boxShadow: '0 2px 8px rgba(11,21,48,.18)' }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="botao-redondo" aria-pressed={discreto} onClick={onAlternarDiscreto}
              aria-label={discreto ? 'Mostrar valores' : 'Esconder valores (modo discreto)'}>
              <Icone nome={discreto ? 'olhoFechado' : 'olho'} />
            </button>
            <button type="button" className="botao-redondo" aria-label="Ajustes" onClick={onAjustes}>
              <Icone nome="ajustes" />
            </button>
          </div>
        </header>

        <div style={{ padding: '14px 22px 0' }}>
          <div className="texto-2">{saudacao()},</div>
          <h1 className="titulo-grande" style={{ textTransform: 'capitalize' }}>{nomeDoMes(mes)}</h1>
        </div>

        {plano ? (
          <section className="cartao-destaque" style={{ marginTop: 16 }} aria-label="Quanto ainda pode gastar">
            <div className="sub">Ainda pode gastar</div>
            <div className="num numero-grande"><Valor centavos={plano.aindaPodeGastar} /></div>
            <div className="sub" style={{ marginTop: 2 }}>de <Valor centavos={plano.limiteDoMes} /> em {nomeDoMes(mes)}</div>
            <div className="linha-por-dia">
              <span className="num"><Valor centavos={plano.porDia} />/dia</span>
              <span className="sub">{plano.diasRestantes === 1 ? 'último dia' : `${plano.diasRestantes} dias`}</span>
            </div>
          </section>
        ) : (
          <section className="cartao-destaque" style={{ marginTop: 16 }}>
            <div className="sub">Gastos de {nomeDoMes(mes)}</div>
            <div className="num numero-grande"><Valor centavos={total} /></div>
            <div className="sub" style={{ marginTop: 2 }}>
              {lancamentos.length === 1 ? '1 lançamento' : `${lancamentos.length} lançamentos`}
            </div>
          </section>
        )}

        <ListaDeAvisos avisos={avisos} categorias={categorias} hoje={hoje()} />

        {comprasParaLembrar.map((c) => (
          <section key={c.id} className="cartao">
            <h2 className="titulo">Já passaram 24 horas: ainda quer {c.descricao}?</h2>
            <p className="texto-2" style={{ margin: '4px 0 10px' }}><Valor centavos={c.preco} />{c.parcelas > 1 ? ` em ${c.parcelas}x` : ' à vista'}.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="chip" style={{ flex: 1 }} onClick={() => onResolverCompra(c.id)}>Desisti</button>
              <button type="button" className="chip" aria-pressed="true" style={{ flex: 1 }} onClick={() => { onResolverCompra(c.id); onLancar(); }}>Comprei, lançar</button>
            </div>
          </section>
        ))}

        {plano && (
          <button type="button" className="cartao-gelo bloco-fatura" onClick={onFatura} aria-label="Abrir a Previsão de fatura">
            {previsao ? (
              <>
                <span className="rotulo">Fatura de {nomeDoMes(previsao.ciclo.vencimento.slice(0, 7))} fecha {previsao.diasAteFechamento === 0 ? 'hoje' : previsao.diasAteFechamento === 1 ? 'amanhã' : `em ${previsao.diasAteFechamento} dias`}</span>
                <span className="num valor-gelo" style={{ fontSize: 24 }}><Valor centavos={previsao.total} /></span>
                {previsao.porCategoria.slice(0, 3).map((c) => (
                  <span key={c.categoriaId} className="linha-fatura"><span>{nomeDaCategoria(c.categoriaId)}</span><span className="num"><Valor centavos={c.total} semCentavos /></span></span>
                ))}
              </>
            ) : (
              <span className="texto-2">Previsão de fatura: toque para informar o dia de fechamento do cartão.</span>
            )}
          </button>
        )}

        {plano && (
          <div style={{ margin: '12px 16px 0' }}>
            <button type="button" className="botao-secundario" onClick={onPossoComprar}>Posso comprar?</button>
          </div>
        )}

        {plano && plano.tetos.length > 0 && (
          <section className="cartao" aria-label="Tetos do mês">
            <h2 className="titulo">Tetos de {nomeDoMes(mes)}</h2>
            <ul className="lista-divisao">
              {[...plano.tetos].sort((a, b) => b.uso - a.uso).slice(0, 5).map((t) => (
                <li key={t.categoriaId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span>{nomeDaCategoria(t.categoriaId)}</span>
                    <span className="num texto-2"><Valor centavos={t.gasto} semCentavos /> de <Valor centavos={t.teto} semCentavos /></span>
                  </div>
                  <div className="barra-progresso" aria-hidden="true">
                    <div className={t.estado === 'estourado' ? 'ruim' : t.estado === 'atencao' ? 'atencao' : ''} style={{ width: `${Math.min(100, t.uso * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {plano?.mesSemTetos && (
          <p className="rotulo" style={{ margin: '10px 24px 0' }}>Os Tetos por Categoria saem dos seus gastos reais, depois do primeiro mês.</p>
        )}

        {metas.length > 0 && (
          <section className="cartao" aria-label="Metas">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="titulo">Metas</h2>
              <button type="button" className="link" style={{ width: 'auto', textAlign: 'right' }} onClick={onMetas}>Ver todas</button>
            </div>
            <ul className="lista-divisao">
              {metas.map((m) => (
                <li key={m.nome}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span>{m.nome}{m.data ? <span className="texto-2"> · {m.data}</span> : null}</span>
                    <span className="num texto-2"><Valor centavos={m.atual} semCentavos /> · {Math.min(100, Math.round(m.progresso * 100))}%</span>
                  </div>
                  <div className="barra-progresso" aria-hidden="true"><div style={{ width: `${Math.min(100, m.progresso * 100)}%` }} /></div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {semPlano && (
          <section className="cartao">
            <h2 className="titulo">Monte seu plano</h2>
            <p className="texto-2" style={{ margin: '4px 0 12px' }}>8 perguntas rápidas e você vê sua Sobra, seu Status e quanto dá para guardar.</p>
            <button type="button" className="botao-principal" onClick={onMontarPlano}>
              Começar
              <span className="seta"><Icone nome="seta" tamanho={18} traco={2} /></span>
            </button>
          </section>
        )}

        {lancamentos.length === 0 ? (
          <section className="cartao" style={{ textAlign: 'center', padding: '24px 18px' }}>
            <img className="capi" src={`${base}capi/capi-caderno.png`} alt="" style={{ height: 120, margin: '0 auto' }} />
            <p className="titulo" style={{ marginTop: 12 }}>Nenhum gasto em {nomeDoMes(mes)} ainda.</p>
            <p className="texto-2" style={{ margin: '4px 0 0' }}>Toque no + e escreva algo como "ifood 42". Eu cuido do resto.</p>
          </section>
        ) : (
          <section className="cartao lista" aria-label={`Lançamentos de ${nomeDoMes(mes)}`}>
            <h2 className="titulo" style={{ paddingBottom: 6 }}>Lançamentos</h2>
            <ul>
              {lancamentos.map((l) => (
                <li key={l.id}>
                  <button type="button" className="item-lancamento" onClick={() => onEditar(l)}>
                    <span className="item-texto">
                      <span className="item-loja">{l.loja}</span>
                      <span className="rotulo">{nomeDaCategoria(l.categoriaId)} · {rotuloDaData(l.data)}</span>
                    </span>
                    <span className="num item-valor"><Valor centavos={l.valor} /></span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="rotulo" style={{ textAlign: 'center', margin: '16px 24px 0', color: 'var(--tx3)' }}>
          {atualizadoEm(lancamentos) && <>Atualizado em {atualizadoEm(lancamentos)}.<br /></>}
          Este plano é educativo e não é recomendação de investimento.
        </p>
      </main>

      <div className="barra-fade" aria-hidden="true" />
      <nav className="barra" aria-label="Navegação">
        <button type="button" className="botao-lancar" aria-label="Lançar gasto" onClick={onLancar}>
          <Icone nome="mais" tamanho={24} traco={2} />
        </button>
      </nav>
    </>
  );
}
