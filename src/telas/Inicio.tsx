import type { ReactNode } from 'react';
import type { Categoria } from '../dominio/categorias';
import type { Lancamento } from '../dominio/lancamento';
import { Icone, type NomeDoIcone } from '../componentes/Icone';
import type { Centavos } from '../motor/dinheiro';
import type { Plano } from '../motor/plano';
import type { PrevisaoDeFatura } from '../motor/previsao';
import type { Aviso } from '../motor/avisos';
import type { CompraEmEspera } from '../motor/compra';
import { ListaDeAvisos } from '../componentes/Avisos';
import { Valor, useModoDiscreto } from './discreto';
import { hoje, nomeDoMes, rotuloDaData, saudacao, semanaDoMes } from './formato';
import type { CapiDoDia } from '../motor/capiDoDia';
import type { AtualizacaoDoCapi } from '../atualizacaoDoCapi';

interface Props {
  mes: string;
  lancamentos: Lancamento[];
  /** Todas as Categorias, inclusive as escondidas, para nomear Lançamentos antigos. */
  categorias: readonly Categoria[];
  onEditar: (lancamento: Lancamento) => void;
  onLancar: () => void;
  onAlternarDiscreto: () => void;
  atualizacao: AtualizacaoDoCapi | null;
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
  onCalendario: () => void;
  onFecharMes: () => void;
  onCheckin: () => void;
  /** A Capi do dia, escolhida pelo Motor e fixa durante o dia. */
  capi: CapiDoDia;
  /** Toque na Capi do dia: leva para a tela ligada à frase. */
  onCapi: () => void;
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

/** Arte do cartão 3D do cartão escuro (design/telas/Home.html). */
function ArteDoCartao() {
  return (
    <div className="hero-arte" aria-hidden="true">
      <svg width="190" height="148" viewBox="0 0 180 140">
        <defs>
          <linearGradient id="cA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F4F7FD" /><stop offset=".45" stopColor="#B9C9EA" /><stop offset="1" stopColor="#5F79B8" /></linearGradient>
          <linearGradient id="cB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3B5BA8" /><stop offset="1" stopColor="#16244D" /></linearGradient>
          <linearGradient id="cG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity=".7" /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0" /></linearGradient>
          <radialGradient id="cS"><stop offset="0" stopColor="#000" stopOpacity=".45" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="96" cy="124" rx="70" ry="10" fill="url(#cS)" />
        <g transform="rotate(-16 90 70)"><rect x="34" y="34" width="132" height="84" rx="14" fill="url(#cB)" /></g>
        <g transform="rotate(-6 90 70)">
          <rect x="18" y="26" width="136" height="86" rx="14" fill="url(#cA)" />
          <rect x="18" y="26" width="136" height="40" rx="14" fill="url(#cG)" />
          <rect x="32" y="52" width="24" height="18" rx="4" fill="#D9E2F3" stroke="#8EA3CF" strokeWidth="1" />
          <circle cx="128" cy="92" r="9" fill="#2E5BDB" fillOpacity=".55" /><circle cx="140" cy="92" r="9" fill="#0D1730" fillOpacity=".35" />
          <rect x="32" y="88" width="56" height="5" rx="2.5" fill="#5F79B8" fillOpacity=".6" />
        </g>
      </svg>
    </div>
  );
}

function Atalho({ icone, rotulo, azul, onClick, aria }: { icone: NomeDoIcone; rotulo: ReactNode; azul?: boolean; onClick?: () => void; aria: string }) {
  return (
    <button type="button" className="atalho" disabled={!onClick} onClick={onClick} aria-label={onClick ? aria : `${aria} (em breve)`}>
      <span className={azul ? 'atalho-icone azul' : 'atalho-icone'}><Icone nome={icone} tamanho={22} traco={1.6} /></span>
      {rotulo}
    </button>
  );
}

export function Inicio({ mes, lancamentos, categorias, onLancar, onEditar, onAlternarDiscreto, atualizacao, semPlano, onMontarPlano, plano, metas, onMetas, previsao, onFatura, avisos, comprasParaLembrar, onResolverCompra, onPossoComprar, onCalendario, onFecharMes, onCheckin, capi, onCapi }: Props) {
  const discreto = useModoDiscreto();
  const total = lancamentos.reduce((soma, l) => soma + l.valor, 0);
  const nomeDaCategoria = (id: string) => categorias.find((c) => c.id === id)?.nome ?? 'Outros';
  const base = import.meta.env.BASE_URL;
  const nomeDoMesAtual = nomeDoMes(mes);
  const mesComMaiuscula = nomeDoMesAtual.charAt(0).toUpperCase() + nomeDoMesAtual.slice(1);

  /** Situação da Categoria em relação ao Teto, para as colunas da fatura. */
  function situacaoDoTeto(categoriaId: string): { texto: string; tom: '' | 'atencao' | 'ruim' } {
    const teto = plano?.tetos.find((t) => t.categoriaId === categoriaId);
    if (!teto) return { texto: '', tom: '' };
    if (teto.estado === 'estourado') return { texto: 'passou', tom: 'ruim' };
    return { texto: `${Math.round(teto.uso * 100)}% do teto`, tom: teto.estado === 'atencao' ? 'atencao' : '' };
  }

  const fecha = previsao ? (previsao.diasAteFechamento === 0 ? 'fecha hoje' : previsao.diasAteFechamento === 1 ? 'fecha amanhã' : `fecha em ${previsao.diasAteFechamento} dias`) : '';

  return (
    <main className="tela">
      <header style={{ padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src={`${base}apple-touch-icon.png`} alt="Capi" width={44} height={44}
          style={{ borderRadius: 11, boxShadow: '0 2px 8px rgba(11,21,48,.18)' }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="botao-redondo botao-sino" onClick={onCheckin}
            aria-label={avisos.length > 0 ? `Avisos (${avisos.length}): abrir o Check-in` : 'Abrir o Check-in'}>
            <Icone nome="sino" />
            {avisos.length > 0 && <span className="marcador" aria-hidden="true" />}
          </button>
          <button type="button" className="botao-redondo" aria-pressed={discreto} onClick={onAlternarDiscreto}
            aria-label={discreto ? 'Mostrar valores' : 'Esconder valores (modo discreto)'}>
            <Icone nome={discreto ? 'olhoFechado' : 'olho'} />
          </button>
        </div>
      </header>

      {atualizacao && (
        <button type="button" className="cartao botao-atualizar-capi" onClick={atualizacao.aplicar}
          disabled={atualizacao.aplicando} aria-busy={atualizacao.aplicando}>
          <Icone nome="repetir" tamanho={18} />
          <span role="status">{atualizacao.aplicando ? 'Atualizando…' : 'Atualizar Capi'}</span>
        </button>
      )}

      <div className="saudacao">
        <div className="saudacao-texto">
          <div className="texto-2">{saudacao()},</div>
          <h1 className="saudacao-mes" style={{ margin: 0 }}>{mesComMaiuscula}, semana {semanaDoMes(hoje())}</h1>
          <p className="texto-2" style={{ fontSize: 14, margin: '6px 0 0', lineHeight: 1.35 }}>{capi.frase}</p>
        </div>
        <button type="button" className="capi-do-dia" aria-label={`Capi do dia: ${capi.frase}`} onClick={onCapi}>
          <img className="capi" src={`${base}capi/dia-${capi.figurinha}.png`} alt="" />
        </button>
      </div>

      {plano ? (
        <section className={Math.abs(plano.aindaPodeGastar) >= 1_000_000 ? 'cartao-destaque hero hero-longo' : 'cartao-destaque hero'} aria-label="Quanto ainda pode gastar">
          <ArteDoCartao />
          <div className="sub">Ainda pode gastar</div>
          <div className="num numero-hero"><Valor centavos={plano.aindaPodeGastar} semCentavos /></div>
          <div className="sub" style={{ marginTop: 2 }}>de <span className="num"><Valor centavos={plano.limiteDoMes} semCentavos /></span> em {nomeDoMesAtual}</div>
          <div className="hero-chips">
            <span className="num claro"><Valor centavos={plano.porDia} semCentavos />/dia</span>
            <span>{plano.diasRestantes === 1 ? 'último dia' : `${plano.diasRestantes} dias`}</span>
          </div>
        </section>
      ) : (
        <section className="cartao-destaque hero">
          <ArteDoCartao />
          <div className="sub">Gastos de {nomeDoMesAtual}</div>
          <div className="num numero-hero"><Valor centavos={total} semCentavos /></div>
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

      {plano && previsao && (
        <button type="button" className="bloco-fatura" onClick={onFatura} aria-label="Abrir a Previsão de fatura">
          <span className="fatura-topo">
            <span>Fatura de {nomeDoMes(previsao.ciclo.vencimento.slice(0, 7))}</span>
            <span className="pilula-vidro">{fecha}</span>
          </span>
          <span className="num fatura-total" style={{ display: 'block' }}><Valor centavos={previsao.total} semCentavos /></span>
          {previsao.porCategoria.length === 0 ? (
            <span className="fatura-vazia" style={{ display: 'block' }}>Nada no cartão neste ciclo ainda.</span>
          ) : (
            <span className="fatura-colunas">
              {previsao.porCategoria.slice(0, 3).map((c) => {
                const s = situacaoDoTeto(c.categoriaId);
                return (
                  <span key={c.categoriaId} className="fatura-coluna" style={{ display: 'block' }}>
                    <span className="nome" style={{ display: 'block' }}>{nomeDaCategoria(c.categoriaId)}</span>
                    <span className={c.total >= 100_000_000 ? 'num valor valor-enorme' : c.total >= 10_000_000 ? 'num valor valor-longo' : 'num valor'} style={{ display: 'block' }}><Valor centavos={c.total} semCentavos /></span>
                    <span className={`situacao ${s.tom}`} style={{ display: 'block' }}>{s.texto}</span>
                  </span>
                );
              })}
            </span>
          )}
        </button>
      )}
      {plano && !previsao && (
        <section className="bloco-fatura" aria-label="Previsão de fatura">
          <div className="fatura-topo"><span>Fatura prevista</span></div>
          <p className="fatura-vazia" style={{ margin: '6px 0 0' }}>Com o dia de fechamento do cartão eu separo o que entra nesta fatura.</p>
          <button type="button" className="chip-pequeno" onClick={onFatura}>informar datas do cartão</button>
        </section>
      )}

      {plano && (
        <section className="cartao" style={{ padding: '18px 12px 16px' }} aria-label="Acesso rápido">
          <h2 className="titulo" style={{ padding: '0 8px 14px', fontSize: 15 }}>Acesso rápido</h2>
          <div className="atalhos">
            <Atalho icone="sacola" azul aria="Posso comprar?" rotulo={<>Posso<br />comprar?</>} onClick={onPossoComprar} />
            <Atalho icone="calendario" aria="Calendário" rotulo="Calendário" onClick={onCalendario} />
            <Atalho icone="check" aria="Check-in" rotulo="Check-in" onClick={onCheckin} />
            <Atalho icone="recibo" aria="Fechar mês" rotulo={<>Fechar<br />mês</>} onClick={onFecharMes} />
          </div>
        </section>
      )}

      {plano && plano.tetos.length > 0 && (
        <section className="cartao" aria-label="Tetos do mês">
          <h2 className="titulo">Tetos de {nomeDoMesAtual}</h2>
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
        <section className="cartao" aria-label="Metas" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="titulo" style={{ fontSize: 15 }}>Metas</h2>
            <button type="button" className="link" style={{ width: 'auto', textAlign: 'right', fontSize: 14, fontWeight: 600 }} onClick={onMetas}>Ver todas</button>
          </div>
          {metas.map((m) => (
            <button key={m.nome} type="button" className="meta-linha" onClick={onMetas}
              style={{ border: 'none', background: 'none', padding: 0, textAlign: 'left', color: 'inherit', width: '100%' }}>
              <span className={m.data ? 'meta-icone' : 'meta-icone azul'}><Icone nome={m.data ? 'calendario' : 'alvo'} tamanho={22} traco={1.6} /></span>
              <span className="meta-corpo">
                <span className="meta-topo">
                  <span>{m.nome}{m.data ? ` · ${m.data}` : ''}</span>
                  <span className="num"><Valor centavos={m.atual} semCentavos /> · {Math.min(100, Math.round(m.progresso * 100))}%</span>
                </span>
                <span className="barra-progresso" aria-hidden="true"><span style={{ display: 'block', width: `${Math.min(100, m.progresso * 100)}%`, height: '100%', borderRadius: 3, background: m.data ? 'var(--hero1)' : 'var(--bl)' }} /></span>
              </span>
            </button>
          ))}
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
          <p className="titulo">Nenhum gasto em {nomeDoMesAtual} ainda.</p>
          <p className="texto-2" style={{ margin: '4px 0 0' }}>Toque no + e escreva algo como "ifood 42". Eu cuido do resto.</p>
        </section>
      ) : (
        <section className="cartao lista" aria-label={`Lançamentos de ${nomeDoMesAtual}`}>
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
  );
}
