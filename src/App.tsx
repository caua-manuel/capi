import { useCallback, useEffect, useMemo, useState } from 'react';
import { criarCategoriaPropria, montarCategorias, type Categoria, type Grupo } from './dominio/categorias';
import { apagarCategoriaPropria, gravarEscondidas, lerEscondidas, listarCategoriasProprias, salvarCategoriaPropria } from './repositorio/categorias';
import { Categorias } from './telas/Categorias';
import { CHAVE_MODO_DISCRETO, ProvedorDiscreto } from './telas/discreto';
import { gravarAjuste, lerAjuste } from './repositorio/ajustes';
import type { Lancamento } from './dominio/lancamento';
import type { RegrasDeEstabelecimento } from './leitor/leitor';
import { lerUrlDeEntrada } from './leitor/url';
import { apagarLancamento, listarLancamentosDesde, listarLancamentosDoMes, salvarLancamento } from './repositorio/lancamentos';
import type { RespostasDoOnboarding } from './dominio/onboarding';
import { calcular, type EntradaDoMotor } from './motor';
import { comprasParaLembrar, type Compra, type CompraEmEspera } from './motor/compra';
import { PossoComprar } from './telas/PossoComprar';
import { somarDias, somarMeses } from './motor/datas';
import { sincronizarFixosDoOnboarding } from './motor/fixos';
import type { Fixo } from './dominio/fixo';
import { listarFixos, salvarFixo, salvarFixos } from './repositorio/fixos';
import { Fixos } from './telas/Fixos';
import type { Meta } from './dominio/meta';
import { apagarMeta, listarMetas, salvarMeta } from './repositorio/metas';
import { Metas } from './telas/Metas';
import { Dividas } from './telas/Dividas';
import type { Fatura } from './dominio/fatura';
import { listarFaturas } from './repositorio/faturas';
import { Assinaturas } from './telas/Assinaturas';
import { Fatura as TelaFatura } from './telas/Fatura';
import type { Cartao } from './motor/previsao';
import type { AvisoMostrado } from './motor/avisos';
import { Cabecalho, Folha } from './componentes/Cabecalho';
import { mesCurto } from './telas/formato';
import { PARAMETROS_PADRAO } from './motor/parametros';
import { gravarOnboarding, lerOnboarding } from './repositorio/onboarding';
import { Diagnostico } from './telas/Diagnostico';
import { Onboarding } from './telas/Onboarding';
import { gravarRegra, lerRegras } from './repositorio/regras';
import { Ajustes } from './telas/Ajustes';
import { Atalho } from './telas/Atalho';
import { Inicio, type MetaNaHome } from './telas/Inicio';
import { NovoGasto, type PreenchimentoDoGasto } from './telas/NovoGasto';
import { centavosParaTexto, hoje, mesDe } from './telas/formato';
import { navegar, rotaAtual, type Rota } from './telas/rotas';

type Folha = { tipo: 'novo'; preenchimento?: PreenchimentoDoGasto } | { tipo: 'editar'; lancamento: Lancamento } | null;

/** Se o app abriu pela URL de entrada (ADR 0003), devolve o Novo gasto preenchido. */
function folhaDaUrl(): Folha {
  if (rotaAtual() !== 'lancar') return null;
  const entrada = lerUrlDeEntrada(window.location.search);
  if (!entrada) return { tipo: 'novo' };
  // O valor vai na frente para o Leitor não confundir números do nome da Loja ("99 Food") com o valor.
  const texto = [entrada.valor !== null ? centavosParaTexto(entrada.valor) : '', entrada.loja].filter(Boolean).join(' ');
  return { tipo: 'novo', preenchimento: { texto, origem: entrada.origem } };
}

export function App() {
  const mes = mesDe(hoje());
  const [rota, setRota] = useState<Rota>(() => (rotaAtual() === 'lancar' ? 'inicio' : rotaAtual()));
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [regras, setRegras] = useState<RegrasDeEstabelecimento>({});
  const [folha, setFolha] = useState<Folha>(folhaDaUrl);
  const [proprias, setProprias] = useState<Categoria[]>([]);
  const [escondidas, setEscondidas] = useState<string[]>([]);
  const { todas, visiveis } = useMemo(() => montarCategorias(proprias, escondidas), [proprias, escondidas]);
  // Nulo enquanto lê a escolha salva: os valores ficam escondidos até lá, para não piscar em público.
  const [discreto, setDiscreto] = useState<boolean | null>(null);

  useEffect(() => {
    void lerAjuste<boolean>(CHAVE_MODO_DISCRETO).then((salvo) => setDiscreto(salvo ?? false));
  }, []);

  async function alternarDiscreto() {
    const novo = !discreto;
    setDiscreto(novo);
    await gravarAjuste(CHAVE_MODO_DISCRETO, novo);
  }

  useEffect(() => {
    // Depois de ler a URL de entrada, o endereço volta para a Início.
    if (rotaAtual() === 'lancar') navegar('inicio', true);
    const aoNavegar = () => setRota(rotaAtual());
    window.addEventListener('popstate', aoNavegar);
    return () => window.removeEventListener('popstate', aoNavegar);
  }, []);

  // Nulo enquanto carrega; indefinido quando ainda não respondeu.
  const [onboarding, setOnboarding] = useState<RespostasDoOnboarding | undefined | null>(null);
  const [recentes, setRecentes] = useState<Lancamento[]>([]);
  const [fixos, setFixos] = useState<Fixo[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [cartao, setCartao] = useState<Cartao | undefined>();
  const [avisosMostrados, setAvisosMostrados] = useState<AvisoMostrado[]>([]);
  // Última abertura antes de hoje, lida uma vez, para o Aviso "sumiu".
  const [ultimaAbertura, setUltimaAbertura] = useState<string | undefined>();

  useEffect(() => {
    void (async () => {
      const anterior = await lerAjuste<string>('ultima-abertura');
      setUltimaAbertura(anterior && anterior < hoje() ? anterior : undefined);
      await gravarAjuste('ultima-abertura', hoje());
      setAvisosMostrados((await lerAjuste<AvisoMostrado[]>('avisos-mostrados')) ?? []);
    })();
  }, []);

  const recarregar = useCallback(async () => {
    const [lista, r, p, e, o, rec, fx, mt, ft, ct] = await Promise.all([
      listarLancamentosDoMes(mes), lerRegras(), listarCategoriasProprias(), lerEscondidas(), lerOnboarding(), listarLancamentosDesde(somarMeses(mes, -3)), listarFixos(), listarMetas(), listarFaturas(), lerAjuste<Cartao>('cartao'),
    ]);
    setLancamentos(lista);
    setRegras(r);
    setProprias(p);
    setEscondidas(e);
    setOnboarding(o);
    setRecentes(rec);
    setMetas(mt);
    setFaturas(ft);
    setCartao(ct);
    // Quem respondeu o Onboarding antes dos Fixos existirem ganha os Fixos dele cadastrados.
    if (o && fx.length === 0) {
      const criados = sincronizarFixosDoOnboarding([], o, mesDe(o.respondidoEm));
      await salvarFixos(criados);
      setFixos(criados);
    } else {
      setFixos(fx);
    }
    // Primeira vez no app: começa pelo Onboarding.
    if (!o && lista.length === 0 && rotaAtual() === 'inicio') navegar('onboarding', true);
  }, [mes]);

  const entradaDoMotor = useMemo<EntradaDoMotor | null>(() => {
    if (!onboarding) return null;
    return {
      hoje: hoje(), onboarding, fixos,
      categorias: todas, lancamentos: recentes, parametros: PARAMETROS_PADRAO, metas, faturas, cartao, avisosMostrados, ultimaAbertura,
    };
  }, [onboarding, fixos, todas, recentes, metas, faturas, cartao, avisosMostrados, ultimaAbertura]);
  const saida = useMemo(() => (entradaDoMotor ? calcular(entradaDoMotor) : null), [entradaDoMotor]);

  // Regra das 24 horas: compras guardadas e as que já passaram de 24 h.
  const [emEspera, setEmEspera] = useState<CompraEmEspera[]>([]);
  useEffect(() => { void lerAjuste<CompraEmEspera[]>('compras-24h').then((l) => setEmEspera(l ?? [])); }, []);
  const paraLembrar = useMemo(() => comprasParaLembrar(emEspera, new Date().toISOString()), [emEspera]);
  function guardarCompra(descricao: string, compra: Compra) {
    const lista = [...emEspera, { ...compra, id: crypto.randomUUID(), descricao, guardadaEm: new Date().toISOString() }];
    setEmEspera(lista);
    void gravarAjuste('compras-24h', lista);
  }
  function resolverCompra(id: string) {
    const lista = emEspera.filter((c) => c.id !== id);
    setEmEspera(lista);
    void gravarAjuste('compras-24h', lista);
  }

  // Guarda os Avisos que apareceram pela primeira vez, para o limite de 3 por semana.
  useEffect(() => {
    if (!saida) return;
    const novos = saida.avisos.filter((a) => !avisosMostrados.some((m) => m.chave === a.chave));
    if (novos.length === 0) return;
    const corte = somarDias(hoje(), -30);
    const lista = [...avisosMostrados.filter((m) => m.data >= corte), ...novos.map((a) => ({ chave: a.chave, data: hoje() }))];
    setAvisosMostrados(lista);
    void gravarAjuste('avisos-mostrados', lista);
  }, [saida, avisosMostrados]);

  // Na home: as Metas que ainda não foram feitas, na ordem da escada.
  const metasNaHome: MetaNaHome[] = (saida?.metas.escada ?? []).filter((m) => !m.feita).slice(0, 3).map((m) => ({
    nome: m.nome, atual: m.atual, progresso: m.progresso, data: m.dataNoRitmo ? mesCurto(m.dataNoRitmo) : undefined,
  }));

  async function concluirOnboarding(respostas: RespostasDoOnboarding) {
    await gravarOnboarding(respostas);
    const sincronizados = sincronizarFixosDoOnboarding(fixos, respostas, onboarding ? mes : mesDe(respostas.respondidoEm));
    await salvarFixos(sincronizados);
    setFixos(sincronizados);
    setOnboarding(respostas);
    navegar('diagnostico', true);
  }

  async function criarCategoria(nome: string, grupo: Grupo): Promise<string> {
    const categoria = criarCategoriaPropria(`propria-${crypto.randomUUID()}`, nome, grupo);
    await salvarCategoriaPropria(categoria);
    setProprias((atuais) => [...atuais, categoria]);
    return categoria.id;
  }

  async function renomearCategoria(categoria: Categoria, nome: string, grupo: Grupo) {
    await salvarCategoriaPropria({ ...categoria, nome, grupo });
    await recarregar();
  }

  async function apagarCategoria(categoria: Categoria) {
    await apagarCategoriaPropria(categoria.id);
    await recarregar();
  }

  async function alternarEscondida(id: string) {
    const novas = escondidas.includes(id) ? escondidas.filter((e) => e !== id) : [...escondidas, id];
    setEscondidas(novas);
    await gravarEscondidas(novas);
  }

  useEffect(() => { void recarregar(); }, [recarregar]);

  async function salvar(lancamento: Lancamento) {
    await salvarLancamento(lancamento);
    // A Categoria escolhida para a Loja vira Regra de estabelecimento.
    await gravarRegra(lancamento.loja, lancamento.categoriaId);
    setFolha(null);
    await recarregar();
  }

  async function apagar(id: string) {
    await apagarLancamento(id);
    setFolha(null);
    await recarregar();
  }

  const fechar = useCallback(() => setFolha(null), []);

  return (
    <ProvedorDiscreto ligado={discreto !== false}>
      {rota === 'ajustes' && <Ajustes />}
      {rota === 'metas' && saida && (
        <Metas plano={saida.metas} metas={metas} renda={saida.diagnostico.renda} temDividas={saida.dividas !== null} dicas={saida.dicas}
          onSalvar={(m) => { setMetas((atuais) => [...atuais.filter((x) => x.id !== m.id), m]); void salvarMeta(m); }}
          onApagar={(id) => { setMetas((atuais) => atuais.filter((x) => x.id !== id)); void apagarMeta(id); }} />
      )}
      {rota === 'dividas' && saida?.dividas && onboarding && <Dividas analise={saida.dividas} dividas={onboarding.dividas} />}
      {rota === 'dividas' && saida && !saida.dividas && (
        <main className="tela tela-detalhe">
          <Cabecalho linha1="Suas dívidas" linha2="nenhuma por aqui" onVoltar={() => navegar('ajustes')} />
          <Folha><p className="texto-2">Você não informou dívidas. Se tiver alguma, inclua em Ajustes → Suas respostas.</p></Folha>
        </main>
      )}
      {rota === 'posso-comprar' && entradaDoMotor && (
        <PossoComprar entrada={entradaDoMotor} categorias={visiveis} onEsperar24h={guardarCompra} />
      )}
      {rota === 'fatura' && (
        <TelaFatura previsao={saida?.previsao ?? null} cartao={cartao} categorias={todas}
          onSalvarCartao={(c) => { setCartao(c); void gravarAjuste('cartao', c); }} />
      )}
      {rota === 'assinaturas' && <Assinaturas recorrentes={saida?.recorrentes ?? []} />}
      {rota === 'fixos' && (
        <Fixos fixos={fixos} mes={mes} categorias={visiveis}
          onSalvar={(f) => { setFixos((atuais) => [...atuais.filter((x) => x.id !== f.id), f]); void salvarFixo(f); }} />
      )}
      {rota === 'onboarding' && onboarding !== null && (
        <Onboarding inicial={onboarding} categorias={visiveis} salarioMinimo={PARAMETROS_PADRAO.salarioMinimo}
          onConcluir={(r) => void concluirOnboarding(r)} onSair={() => navegar(onboarding ? 'ajustes' : 'inicio')} />
      )}
      {rota === 'diagnostico' && saida && (
        <Diagnostico diagnostico={saida.diagnostico} onVoltar={() => navegar('inicio')} onContinuar={() => navegar('inicio')} />
      )}
      {rota === 'diagnostico' && onboarding === undefined && (
        <Onboarding categorias={visiveis} salarioMinimo={PARAMETROS_PADRAO.salarioMinimo}
          onConcluir={(r) => void concluirOnboarding(r)} onSair={() => navegar('inicio')} />
      )}
      {rota === 'atalho' && <Atalho />}
      {rota === 'categorias' && (
        <Categorias todas={todas} escondidas={escondidas} onAlternarEscondida={alternarEscondida}
          onCriar={(nome, grupo) => void criarCategoria(nome, grupo)} onRenomear={renomearCategoria} onApagar={apagarCategoria} />
      )}
      {(rota === 'inicio' || rota === 'lancar') && (
        <Inicio mes={mes} lancamentos={lancamentos} categorias={todas} onAjustes={() => navegar('ajustes')} onAlternarDiscreto={alternarDiscreto}
          semPlano={onboarding === undefined} onMontarPlano={() => navegar('onboarding')}
          plano={saida?.plano ?? null} metas={metasNaHome} onMetas={() => navegar('metas')}
          previsao={saida?.previsao ?? null} onFatura={() => navegar('fatura')} avisos={saida?.avisos ?? []}
          comprasParaLembrar={paraLembrar} onResolverCompra={resolverCompra} onPossoComprar={() => navegar('posso-comprar')}
          onLancar={() => setFolha({ tipo: 'novo' })} onEditar={(l) => setFolha({ tipo: 'editar', lancamento: l })} />
      )}
      {folha && (
        <NovoGasto key={folha.tipo === 'editar' ? folha.lancamento.id : 'novo'} categorias={visiveis} regras={regras}
          onCriarCategoria={criarCategoria}
          editando={folha.tipo === 'editar' ? folha.lancamento : undefined}
          preenchimento={folha.tipo === 'novo' ? folha.preenchimento : undefined}
          onSalvar={salvar} onApagar={apagar} onFechar={fechar} />
      )}
    </ProvedorDiscreto>
  );
}
