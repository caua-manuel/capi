import { useState, type ReactNode } from 'react';
import { CampoDinheiro } from '../componentes/CampoDinheiro';
import { Icone } from '../componentes/Icone';
import type { Categoria } from '../dominio/categorias';
import type {
  ComQuemMora, Divida, FixoDeclarado, Objetivo, OndeGuarda, RespostasDoOnboarding, TipoDeDivida, TipoDeRenda, Trabalho,
} from '../dominio/onboarding';
import type { Centavos } from '../motor/dinheiro';
import { formatarReais, hoje } from './formato';

interface Props {
  /** Respostas já salvas, para editar. */
  inicial?: RespostasDoOnboarding;
  categorias: readonly Categoria[];
  /** Da tabela de Parâmetros: base da estimativa de renda. */
  salarioMinimo: Centavos;
  onConcluir: (respostas: RespostasDoOnboarding) => void;
  onSair: () => void;
}

const PASSOS = ['Renda', 'Tipo de renda', 'Trabalho', 'Moradia', 'Fixos', 'Dívidas', 'Guardado', 'Objetivos'] as const;

const opcoes = <T extends string>(lista: [T, string][]) => lista;
const TIPOS_DE_RENDA = opcoes<TipoDeRenda>([['fixa', 'Fixa'], ['varia-pouco', 'Varia pouco'], ['varia-muito', 'Varia muito']]);
const TRABALHOS = opcoes<Trabalho>([
  ['clt', 'CLT'], ['servidor', 'Servidor'], ['pj-autonomo', 'PJ ou autônomo'], ['empresa-familia', 'Empresa da família'],
  ['estudante', 'Estudante'], ['outro', 'Outro'],
]);
const COM_QUEM = opcoes<ComQuemMora>([['sozinho', 'Sozinho'], ['familia', 'Com a família'], ['parceiro', 'Com parceiro(a)'], ['republica', 'República']]);
const ONDE = opcoes<OndeGuarda>([
  ['conta', 'Conta'], ['poupanca', 'Poupança'], ['cdb', 'CDB'], ['tesouro', 'Tesouro'], ['acoes', 'Ações'], ['cripto', 'Cripto'], ['outro', 'Outro'],
]);
const TIPOS_DE_DIVIDA = opcoes<TipoDeDivida>([
  ['cartao-rotativo', 'Rotativo do cartão'], ['cheque-especial', 'Cheque especial'], ['emprestimo', 'Empréstimo'],
  ['financiamento', 'Financiamento'], ['outro', 'Outra'],
]);
export const OBJETIVOS = opcoes<Objetivo>([
  ['quitar-dividas', 'Sair do vermelho'], ['reserva', 'Montar reserva'], ['juntar-valor', 'Juntar um valor'], ['viagem', 'Viagem'],
  ['comprar', 'Comprar algo'], ['investir', 'Começar a investir'], ['morar-sozinho', 'Morar sozinho, casar ou filho'],
  ['organizar', 'Parar de faltar dinheiro'], ['aposentadoria', 'Aposentadoria'],
]);
const SUGESTOES_DE_FIXO: [string, string][] = [
  ['Academia', 'treino'], ['Celular', 'casa-contas'], ['Internet', 'casa-contas'], ['Faculdade', 'educacao'], ['Plano de saúde', 'saude'],
];
const CHIPS_DE_RENDA = [150000, 250000, 400000, 600000, 1000000];

const novoId = () => crypto.randomUUID().slice(0, 8);
const novaDivida = (): Divida => ({ id: novoId(), nome: '', tipo: 'emprestimo', saldo: 0, jurosMensal: 0.03, parcela: 0, emAtraso: false });

interface Rascunho {
  renda: Centavos | null;
  tipo: TipoDeRenda;
  ultimosMeses: (Centavos | null)[];
  trabalho: Trabalho | null;
  comQuem: ComQuemMora | null;
  moradia: Centavos | null;
  fixos: FixoDeclarado[];
  variaveisEssencial: Centavos | null;
  variaveisEstilo: Centavos | null;
  temDividas: boolean | null;
  dividas: Divida[];
  guardado: Centavos | null;
  onde: OndeGuarda;
  objetivos: Objetivo[];
  estimado: string[];
}

function rascunhoDe(r?: RespostasDoOnboarding): Rascunho {
  if (!r) {
    return {
      renda: null, tipo: 'fixa', ultimosMeses: Array<Centavos | null>(6).fill(null), trabalho: null, comQuem: null, moradia: null, fixos: [],
      variaveisEssencial: null, variaveisEstilo: null, temDividas: null, dividas: [], guardado: null, onde: 'conta', objetivos: [], estimado: [],
    };
  }
  return {
    renda: r.renda.valor, tipo: r.renda.tipo,
    ultimosMeses: [...r.renda.ultimosMeses, ...Array<Centavos | null>(6).fill(null)].slice(0, 6),
    trabalho: r.trabalho, comQuem: r.moradia.comQuem, moradia: r.moradia.valor, fixos: r.fixos,
    variaveisEssencial: r.variaveis.essencial, variaveisEstilo: r.variaveis.estiloDeVida,
    temDividas: r.dividas.length > 0, dividas: r.dividas, guardado: r.guardado.valor, onde: r.guardado.onde, objetivos: r.objetivos, estimado: r.estimado,
  };
}

function Chips<T extends string>({ lista, valor, onEscolher }: {
  lista: [T, string][]; valor: T | T[] | null; onEscolher: (v: T) => void; multiplo?: boolean;
}) {
  return (
    <div className="chips-livres" role="group">
      {lista.map(([id, nome]) => {
        const ativo = Array.isArray(valor) ? valor.includes(id) : valor === id;
        return <button key={id} type="button" className="chip" aria-pressed={ativo} onClick={() => onEscolher(id)}>{nome}</button>;
      })}
    </div>
  );
}

function Pergunta({ linha1, linha2, children }: { linha1: string; linha2: string; children: ReactNode }) {
  return (
    <>
      <h1 className="pergunta">{linha1}<br /><span className="texto-2">{linha2}</span></h1>
      <div className="pergunta-corpo">{children}</div>
    </>
  );
}

export function Onboarding({ inicial, categorias, salarioMinimo, onConcluir, onSair }: Props) {
  const [passo, setPasso] = useState(0);
  const [r, setR] = useState<Rascunho>(() => rascunhoDe(inicial));
  const mudar = (parcial: Partial<Rascunho>) => setR((atual) => ({ ...atual, ...parcial }));
  const estimar = (pergunta: string, parcial: Partial<Rascunho>) =>
    setR((atual) => ({ ...atual, ...parcial, estimado: atual.estimado.includes(pergunta) ? atual.estimado : [...atual.estimado, pergunta] }));
  const renda = r.renda ?? 0;
  const base = import.meta.env.BASE_URL;

  const podeSeguir = [
    r.renda !== null && r.renda > 0,
    true,
    r.trabalho !== null,
    r.comQuem !== null && r.moradia !== null,
    r.fixos.every((f) => f.nome.trim() && f.valor > 0),
    r.temDividas === false || (r.temDividas === true && r.dividas.length > 0 && r.dividas.every((d) => d.saldo > 0)),
    r.guardado !== null,
    r.objetivos.length > 0,
  ][passo];

  function concluir() {
    onConcluir({
      renda: { valor: renda, tipo: r.tipo, ultimosMeses: r.tipo === 'fixa' ? [] : r.ultimosMeses.filter((v): v is Centavos => v !== null && v > 0) },
      trabalho: r.trabalho ?? 'outro',
      moradia: { comQuem: r.comQuem ?? 'sozinho', valor: r.moradia ?? 0 },
      fixos: r.fixos.map((f) => ({ ...f, nome: f.nome.trim() })),
      variaveis: { essencial: r.variaveisEssencial ?? 0, estiloDeVida: r.variaveisEstilo ?? 0 },
      anuais: inicial?.anuais ?? [],
      dividas: r.temDividas ? r.dividas.map((d) => ({ ...d, nome: d.nome.trim() || 'Dívida' })) : [],
      guardado: { valor: r.guardado ?? 0, onde: r.onde },
      guardaPorMes: inicial?.guardaPorMes,
      objetivos: r.objetivos,
      temDependentes: inicial?.temDependentes,
      estimado: r.estimado,
      respondidoEm: inicial?.respondidoEm ?? hoje(),
    });
  }

  const avancar = () => (passo === PASSOS.length - 1 ? concluir() : setPasso(passo + 1));
  const voltar = () => (passo === 0 ? onSair() : setPasso(passo - 1));
  const mudarFixo = (id: string, parcial: Partial<FixoDeclarado>) => mudar({ fixos: r.fixos.map((f) => (f.id === id ? { ...f, ...parcial } : f)) });
  const mudarDivida = (id: string, parcial: Partial<Divida>) => mudar({ dividas: r.dividas.map((d) => (d.id === id ? { ...d, ...parcial } : d)) });

  return (
    <main className="tela onboarding">
      <header className="onboarding-topo">
        <button type="button" className="botao-redondo" aria-label="Voltar" onClick={voltar}><Icone nome="voltar" /></button>
        <span className="titulo">{PASSOS[passo]}</span>
        <span className="num texto-2 contador-passos">{passo + 1}/{PASSOS.length}</span>
      </header>
      <div className="progresso-passos" role="progressbar" aria-valuemin={1} aria-valuemax={PASSOS.length} aria-valuenow={passo + 1}
        aria-label={`Pergunta ${passo + 1} de ${PASSOS.length}`}>
        {PASSOS.map((p, i) => <div key={p} className={i <= passo ? 'feito' : ''} />)}
      </div>
      {passo === 0 && <img className="capi capi-onboarding" src={`${base}capi/capi-caderno.png`} alt="" />}

      <div className="onboarding-conteudo">
        {passo === 0 && (
          <Pergunta linha1="Quanto cai na sua conta" linha2="por mês, líquido?">
            <div className="cartao" style={{ margin: 0 }}>
              <CampoDinheiro id="renda" rotulo="Valor mensal" valor={r.renda} onMudar={(v) => mudar({ renda: v })} grande />
            </div>
            <div className="chips-livres">
              {CHIPS_DE_RENDA.map((v) => (
                <button key={v} type="button" className="chip num" aria-pressed={r.renda === v} onClick={() => mudar({ renda: v })}>
                  {formatarReais(v).replace(',00', '')}
                </button>
              ))}
            </div>
            <button type="button" className="link-estimar" onClick={() => estimar('renda', { renda: 2 * salarioMinimo })}>Não sei, quero estimar</button>
            <p className="ajuda">É a base dos seus tetos, metas e de quanto dá para guardar.</p>
          </Pergunta>
        )}

        {passo === 1 && (
          <Pergunta linha1="Essa renda é fixa" linha2="ou varia?">
            <Chips lista={TIPOS_DE_RENDA} valor={r.tipo} onEscolher={(tipo) => mudar({ tipo })} />
            {r.tipo !== 'fixa' && (
              <div className="cartao" style={{ margin: 0 }}>
                <p className="rotulo" style={{ margin: '0 0 8px' }}>
                  Quanto entrou nos últimos meses? Uso a média dos 3 piores para não contar com dinheiro que talvez não venha.
                </p>
                <div className="grade-meses">
                  {r.ultimosMeses.map((v, i) => (
                    <CampoDinheiro key={i} id={`mes-${i}`} rotulo={`${i + 1}º mês`} valor={v}
                      onMudar={(nv) => mudar({ ultimosMeses: r.ultimosMeses.map((x, j) => (j === i ? nv : x)) })} />
                  ))}
                </div>
              </div>
            )}
            <p className="ajuda">Define o tamanho da reserva e com quanto o plano pode contar.</p>
          </Pergunta>
        )}

        {passo === 2 && (
          <Pergunta linha1="Como você" linha2="trabalha?">
            <Chips lista={TRABALHOS} valor={r.trabalho} onEscolher={(trabalho) => mudar({ trabalho })} />
            <p className="ajuda">Define quantos meses de reserva fazem sentido para você.</p>
          </Pergunta>
        )}

        {passo === 3 && (
          <Pergunta linha1="Mora com quem e quanto" linha2="paga de moradia?">
            <Chips lista={COM_QUEM} valor={r.comQuem} onEscolher={(comQuem) => mudar({ comQuem })} />
            <div className="cartao" style={{ margin: 0 }}>
              <CampoDinheiro id="moradia" rotulo="Aluguel, condomínio e contas da casa, por mês" valor={r.moradia} onMudar={(v) => mudar({ moradia: v })} />
            </div>
            <div className="chips-livres">
              <button type="button" className="chip" aria-pressed={r.moradia === 0} onClick={() => mudar({ moradia: 0 })}>Não pago</button>
            </div>
            <button type="button" className="link-estimar" onClick={() => estimar('moradia', { moradia: Math.round(renda * 0.3) })}>Não sei, quero estimar</button>
          </Pergunta>
        )}

        {passo === 4 && (
          <Pergunta linha1="Gastos fixos" linha2="fora do cartão">
            <div className="chips-livres">
              {SUGESTOES_DE_FIXO.filter(([nome]) => !r.fixos.some((f) => f.nome === nome)).map(([nome, categoriaId]) => (
                <button key={nome} type="button" className="chip"
                  onClick={() => mudar({ fixos: [...r.fixos, { id: novoId(), nome, valor: 0, categoriaId, dia: 10 }] })}>+ {nome}</button>
              ))}
              <button type="button" className="chip chip-novo"
                onClick={() => mudar({ fixos: [...r.fixos, { id: novoId(), nome: '', valor: 0, categoriaId: 'outros', dia: 10 }] })}>+ Outro</button>
            </div>
            {r.fixos.map((f) => (
              <div key={f.id} className="cartao linha-form" style={{ margin: 0 }}>
                <div className="campo"><input aria-label="Nome do fixo" placeholder="Nome" value={f.nome} onChange={(e) => mudarFixo(f.id, { nome: e.target.value })} /></div>
                <CampoDinheiro id={`fixo-${f.id}`} rotulo="Valor por mês" valor={f.valor || null} onMudar={(v) => mudarFixo(f.id, { valor: v ?? 0 })} />
                <div className="linha-dupla">
                  <label className="rotulo">Categoria
                    <select className="seletor" value={f.categoriaId} onChange={(e) => mudarFixo(f.id, { categoriaId: e.target.value })}>
                      {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </label>
                  <label className="rotulo">Dia
                    <input className="seletor num" type="number" min={1} max={31} value={f.dia}
                      onChange={(e) => mudarFixo(f.id, { dia: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })} />
                  </label>
                </div>
                <button type="button" className="botao-apagar" onClick={() => mudar({ fixos: r.fixos.filter((x) => x.id !== f.id) })}>
                  <Icone nome="lixo" tamanho={18} /> Tirar
                </button>
              </div>
            ))}
            <div className="cartao" style={{ margin: 0 }}>
              <h2 className="titulo">E no dia a dia?</h2>
              <p className="rotulo" style={{ margin: '2px 0 10px' }}>
                Cartão, Pix e dinheiro, mais ou menos por mês. Quando a primeira fatura chegar, uso os números reais.
              </p>
              <CampoDinheiro id="var-ess" rotulo="Mercado, transporte, farmácia" valor={r.variaveisEssencial} onMudar={(v) => mudar({ variaveisEssencial: v })} />
              <div style={{ height: 10 }} />
              <CampoDinheiro id="var-est" rotulo="Delivery, saídas, compras, assinaturas" valor={r.variaveisEstilo} onMudar={(v) => mudar({ variaveisEstilo: v })} />
              <button type="button" className="link-estimar"
                onClick={() => estimar('variaveis', { variaveisEssencial: Math.round(renda * 0.25), variaveisEstilo: Math.round(renda * 0.15) })}>
                Não sei, quero estimar
              </button>
            </div>
          </Pergunta>
        )}

        {passo === 5 && (
          <Pergunta linha1="Tem dívidas" linha2="hoje?">
            <div className="chips-livres">
              <button type="button" className="chip" aria-pressed={r.temDividas === false} onClick={() => mudar({ temDividas: false })}>Nenhuma</button>
              <button type="button" className="chip" aria-pressed={r.temDividas === true}
                onClick={() => mudar({ temDividas: true, dividas: r.dividas.length ? r.dividas : [novaDivida()] })}>Tenho</button>
            </div>
            {r.temDividas && r.dividas.map((d) => (
              <div key={d.id} className="cartao linha-form" style={{ margin: 0 }}>
                <div className="campo">
                  <input aria-label="Nome da dívida" placeholder="Nome (ex.: cartão, banco)" value={d.nome} onChange={(e) => mudarDivida(d.id, { nome: e.target.value })} />
                </div>
                <label className="rotulo">Tipo
                  <select className="seletor" value={d.tipo} onChange={(e) => mudarDivida(d.id, { tipo: e.target.value as TipoDeDivida })}>
                    {TIPOS_DE_DIVIDA.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                  </select>
                </label>
                <CampoDinheiro id={`saldo-${d.id}`} rotulo="Quanto falta pagar" valor={d.saldo || null} onMudar={(v) => mudarDivida(d.id, { saldo: v ?? 0 })} />
                <div className="linha-dupla">
                  <label className="rotulo">Juros ao mês (%)
                    <input className="seletor num" inputMode="decimal" defaultValue={String(Math.round(d.jurosMensal * 1000) / 10).replace('.', ',')}
                      onChange={(e) => mudarDivida(d.id, { jurosMensal: Math.max(0, Number(e.target.value.replace(',', '.')) || 0) / 100 })} />
                  </label>
                  <CampoDinheiro id={`parcela-${d.id}`} rotulo="Parcela" valor={d.parcela || null} onMudar={(v) => mudarDivida(d.id, { parcela: v ?? 0 })} />
                </div>
                <label className="linha-categoria">
                  <span>Está atrasada</span>
                  <input type="checkbox" role="switch" className="interruptor" checked={d.emAtraso} onChange={(e) => mudarDivida(d.id, { emAtraso: e.target.checked })} />
                </label>
                <button type="button" className="botao-apagar" onClick={() => mudar({ dividas: r.dividas.filter((x) => x.id !== d.id) })}>
                  <Icone nome="lixo" tamanho={18} /> Tirar
                </button>
              </div>
            ))}
            {r.temDividas && (
              <button type="button" className="chip chip-novo" style={{ alignSelf: 'flex-start' }}
                onClick={() => mudar({ dividas: [...r.dividas, novaDivida()] })}>+ Outra dívida</button>
            )}
            <p className="ajuda">Juros altos viram prioridade no plano. Não sabe os juros? Deixe 3%, dá para mudar depois.</p>
          </Pergunta>
        )}

        {passo === 6 && (
          <Pergunta linha1="Quanto tem guardado" linha2="hoje, e onde?">
            <div className="cartao" style={{ margin: 0 }}>
              <CampoDinheiro id="guardado" rotulo="Total guardado" valor={r.guardado} onMudar={(v) => mudar({ guardado: v })} grande />
            </div>
            <div className="chips-livres">
              <button type="button" className="chip" aria-pressed={r.guardado === 0} onClick={() => mudar({ guardado: 0 })}>Nada ainda</button>
            </div>
            <Chips lista={ONDE} valor={r.onde} onEscolher={(onde) => mudar({ onde })} />
            <p className="ajuda">É o ponto de partida da reserva e das metas.</p>
          </Pergunta>
        )}

        {passo === 7 && (
          <Pergunta linha1="Quais são seus" linha2="objetivos?">
            <Chips multiplo lista={OBJETIVOS} valor={r.objetivos}
              onEscolher={(o) => mudar({ objetivos: r.objetivos.includes(o) ? r.objetivos.filter((x) => x !== o) : [...r.objetivos, o] })} />
            <p className="ajuda">Pode escolher vários. Eu coloco em ordem para você.</p>
          </Pergunta>
        )}
      </div>

      <div className="onboarding-rodape">
        <button type="button" className="botao-principal" disabled={!podeSeguir} onClick={avancar}>
          {passo === PASSOS.length - 1 ? 'Ver meu diagnóstico' : 'Continuar'}
          <span className="seta"><Icone nome="seta" tamanho={18} traco={2} /></span>
        </button>
      </div>
    </main>
  );
}
