import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { acompanharAtualizacao, type AtualizacaoDoCapi } from './atualizacaoDoCapi';
import { criarCategoriaPropria, montarCategorias, type Categoria, type Grupo } from './dominio/categorias';
import { apagarCategoriaPropria, gravarEscondidas, lerEscondidas, listarCategoriasProprias, salvarCategoriaPropria } from './repositorio/categorias';
import { Categorias } from './telas/Categorias';
import { CHAVE_MODO_DISCRETO, ProvedorDiscreto } from './telas/discreto';
import { gravarAjuste, lerAjuste } from './repositorio/ajustes';
import type { Lancamento } from './dominio/lancamento';
import type { RegrasDeEstabelecimento } from './leitor/leitor';
import { lerUrlDeEntrada } from './leitor/url';
import { buscarPendentesDoAtalho, lerCodigoDoAparelho, ouvirMudancasDoCodigo } from './leitor/pushDoAtalho';
import type { PendenteDoAtalho } from './dominio/pendente';
import { descartarPendenteDoAtalho, listarPendentesDoAtalho, salvarPendenteComoLancamento } from './repositorio/pendentes';
import { apagarComSeguintes, listarLancamentosDesde, listarLancamentosDoMes, restaurarLancamentos, salvarLancamento } from './repositorio/lancamentos';
import { AvisoDeDesfazer } from './componentes/AvisoDeDesfazer';
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
import { EseSim } from './telas/EseSim';
import { aplicarCenario } from './motor/simulador';
import type { AjustesDoPlano } from './motor/plano';
import { Dividas } from './telas/Dividas';
import type { Fatura } from './dominio/fatura';
import { listarFaturas } from './repositorio/faturas';
import { Assinaturas } from './telas/Assinaturas';
import { Fatura as TelaFatura } from './telas/Fatura';
import type { Cartao } from './motor/previsao';
import type { AvisoMostrado } from './motor/avisos';
import { Cabecalho, Folha } from './componentes/Cabecalho';
import { BarraDeBaixo, ehAba } from './componentes/BarraDeBaixo';
import { mesCurto } from './telas/formato';
import { gravarParametros, lerParametros, parametrosPadraoSalvos, type ParametrosSalvos } from './repositorio/parametros';
import { Parametros, resumoDosParametros } from './telas/Parametros';
import { montarCalendario } from './motor/calendario';
import { Calendario } from './telas/Calendario';
import { fecharMes, mesParaFechar } from './motor/fechamento';
import { Fechamento } from './telas/Fechamento';
import { fazerCheckin } from './motor/checkin';
import { CheckIn } from './telas/CheckIn';
import { DiaDoPagamento } from './telas/DiaDoPagamento';
import { Lembretes } from './telas/Lembretes';
import { Backup } from './telas/Backup';
import { capiDoDia, type CapiDoDia } from './motor/capiDoDia';
import { registrarBackupFeito } from './repositorio/backup';
import { gravarOnboarding, lerOnboarding } from './repositorio/onboarding';
import { Diagnostico } from './telas/Diagnostico';
import { Onboarding } from './telas/Onboarding';
import { gravarRegra, lerRegras } from './repositorio/regras';
import { Ajustes } from './telas/Ajustes';
import { Instalar } from './telas/Instalar';
import { lerAmbiente, precisaInstalar } from './telas/instalacao';
import { aparenciaSalva, aplicarAparencia, CHAVE_APARENCIA, guardarAparencia, ouvirTemaDoAparelho, type Aparencia } from './telas/aparencia';
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
  const [atualizacao, setAtualizacao] = useState<AtualizacaoDoCapi | null>(null);
  const podeRecarregar = useRef(false);
  useEffect(() => acompanharAtualizacao(setAtualizacao, () => podeRecarregar.current), []);
  const [rota, setRota] = useState<Rota>(() => (rotaAtual() === 'lancar' ? 'inicio' : rotaAtual()));
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [regras, setRegras] = useState<RegrasDeEstabelecimento>({});
  const [folha, setFolha] = useState<Folha>(folhaDaUrl);
  const [pendentesDoAtalho, setPendentesDoAtalho] = useState<PendenteDoAtalho[]>([]);
  const leituraDaFila = useRef(0);
  const relerPendentes = useCallback(async () => {
    const leitura = ++leituraDaFila.current;
    const fila = await listarPendentesDoAtalho();
    if (leitura === leituraDaFila.current) setPendentesDoAtalho(fila);
  }, []);
  const pendenteAberto = folha ? undefined : pendentesDoAtalho[0];
  const folhaAberta: Folha = folha ?? (pendenteAberto ? {
    tipo: 'novo', preenchimento: {
      origem: 'applepay', pendente: pendenteAberto,
      texto: `${centavosParaTexto(pendenteAberto.valor)} ${pendenteAberto.loja}`,
    },
  } : null);
  const temFolhaAberta = Boolean(folhaAberta);
  useLayoutEffect(() => {
    podeRecarregar.current = !temFolhaAberta;
  }, [temFolhaAberta]);
  const [proprias, setProprias] = useState<Categoria[]>([]);
  const [escondidas, setEscondidas] = useState<string[]>([]);
  const { todas, visiveis } = useMemo(() => montarCategorias(proprias, escondidas), [proprias, escondidas]);
  // Nulo enquanto lê a escolha salva: os valores ficam escondidos até lá, para não piscar em público.
  const [discreto, setDiscreto] = useState<boolean | null>(null);

  useEffect(() => {
    void lerAjuste<boolean>(CHAVE_MODO_DISCRETO).then((salvo) => setDiscreto(salvo ?? false));
  }, []);

  const [precisaDeInstalacao] = useState(() => precisaInstalar(lerAmbiente()));
  // Nulo enquanto lê a escolha salva de continuar no navegador.
  const [instalacaoDispensada, setInstalacaoDispensada] = useState<boolean | null>(precisaDeInstalacao ? null : true);
  useEffect(() => {
    if (precisaDeInstalacao) void lerAjuste<boolean>('instalacao-dispensada').then((v) => setInstalacaoDispensada(v === true));
  }, [precisaDeInstalacao]);

  const [aparencia, setAparencia] = useState<Aparencia>(aparenciaSalva);
  useEffect(() => {
    // O backup traz a escolha junto com os outros ajustes: ela vale sobre a cópia do aparelho.
    void lerAjuste<Aparencia>(CHAVE_APARENCIA).then((salva) => { if (salva) { guardarAparencia(salva); setAparencia(salva); } });
  }, []);
  useEffect(() => {
    aplicarAparencia(aparencia);
    return aparencia === 'automatica' ? ouvirTemaDoAparelho(() => aplicarAparencia(aparencia)) : undefined;
  }, [aparencia]);
  function mudarAparencia(nova: Aparencia) {
    setAparencia(nova);
    guardarAparencia(nova);
    void gravarAjuste(CHAVE_APARENCIA, nova);
  }

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

  useEffect(() => {
    const { standaloneDoIOS, modoDeExibicaoStandalone } = lerAmbiente();
    if (!standaloneDoIOS && !modoDeExibicaoStandalone) return;

    let ultimaBusca: Promise<void> | undefined;
    const reler = () => { void relerPendentes().catch(() => {}); };
    let ativo = true;
    const buscar = () => {
      if (document.visibilityState === 'hidden') return;
      reler();
      const codigo = lerCodigoDoAparelho();
      if (!codigo || !navigator.onLine) return;
      const busca = buscarPendentesDoAtalho(codigo);
      if (busca === ultimaBusca) return;
      ultimaBusca = busca;
      void busca.then(() => { if (ativo) reler(); })
        .catch(() => { /* A próxima abertura ou volta da rede tenta de novo. */ });
    };
    const aoTocarNaNotificacao = (evento: MessageEvent) => {
      if (evento.data?.tipo === 'buscar-pendentes-do-atalho') buscar();
    };
    const pararDeOuvir = ouvirMudancasDoCodigo(buscar);
    window.addEventListener('focus', buscar);
    window.addEventListener('online', buscar);
    document.addEventListener('visibilitychange', buscar);
    navigator.serviceWorker?.addEventListener('message', aoTocarNaNotificacao);
    buscar();
    return () => {
      ativo = false;
      leituraDaFila.current++;
      pararDeOuvir();
      window.removeEventListener('focus', buscar);
      window.removeEventListener('online', buscar);
      document.removeEventListener('visibilitychange', buscar);
      navigator.serviceWorker?.removeEventListener('message', aoTocarNaNotificacao);
    };
  }, [relerPendentes]);

  // Nulo enquanto carrega; indefinido quando ainda não respondeu.
  const [onboarding, setOnboarding] = useState<RespostasDoOnboarding | undefined | null>(null);
  const [recentes, setRecentes] = useState<Lancamento[]>([]);
  const [fixos, setFixos] = useState<Fixo[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [cartao, setCartao] = useState<Cartao | undefined>();
  const [parametros, setParametros] = useState<ParametrosSalvos>(parametrosPadraoSalvos);
  useEffect(() => { void lerParametros().then(setParametros); }, []);
  function salvarParametros(novos: ParametrosSalvos) {
    setParametros(novos);
    void gravarParametros(novos);
  }
  const [ajustesDoPlano, setAjustesDoPlano] = useState<AjustesDoPlano>({ cortes: {} });
  useEffect(() => { void lerAjuste<AjustesDoPlano>('ajustes-do-plano').then((s) => s && setAjustesDoPlano(s)); }, []);
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
      listarLancamentosDoMes(mes), lerRegras(), listarCategoriasProprias(), lerEscondidas(), lerOnboarding(), listarLancamentosDesde(somarMeses(mes, -5)), listarFixos(), listarMetas(), listarFaturas(), lerAjuste<Cartao>('cartao'),
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
      categorias: todas, lancamentos: recentes, parametros: parametros.valores, metas, faturas, cartao, avisosMostrados, ultimaAbertura, ajustesDoPlano,
    };
  }, [onboarding, fixos, todas, recentes, metas, faturas, cartao, avisosMostrados, ultimaAbertura, parametros, ajustesDoPlano]);
  const saida = useMemo(() => (entradaDoMotor ? calcular(entradaDoMotor) : null), [entradaDoMotor]);

  const calendario = useMemo(() => {
    if (!onboarding || !saida) return null;
    return montarCalendario({
      hoje: hoje(), fixos, recorrentes: saida.recorrentes, lancamentos: recentes, faturas, cartao, anuais: onboarding.anuais, respondidoEm: onboarding.respondidoEm,
      salario: onboarding.diaDoSalario ? { dia: onboarding.diaDoSalario, valor: onboarding.renda.valor } : undefined,
    });
  }, [onboarding, saida, fixos, faturas, cartao, recentes]);

  // Capi do dia: o Motor escolhe e a escolha fica fixa até o dia seguinte (no máximo uma mudança por dia).
  const [capiSalva, setCapiSalva] = useState<{ data: string; capi: CapiDoDia } | null | undefined>(undefined);
  useEffect(() => { void lerAjuste<{ data: string; capi: CapiDoDia }>('capi-do-dia').then((s) => setCapiSalva(s ?? null)); }, []);
  const capiCalculada = useMemo(
    () => (saida ? capiDoDia({ hoje: hoje(), avisos: saida.avisos, aindaPodeGastar: saida.plano.aindaPodeGastar }) : null),
    [saida],
  );
  useEffect(() => {
    if (capiSalva === undefined || !capiCalculada || capiSalva?.data === hoje()) return;
    const nova = { data: hoje(), capi: capiCalculada };
    setCapiSalva(nova);
    void gravarAjuste('capi-do-dia', nova);
  }, [capiSalva, capiCalculada]);
  const capiDeHoje: CapiDoDia = (capiSalva?.data === hoje() ? capiSalva.capi : capiCalculada) ?? capiDoDia({ hoje: hoje(), avisos: [] });
  function abrirCapi() {
    if (capiDeHoje.destino === 'novo-gasto') setFolha({ tipo: 'novo' });
    else navegar(capiDeHoje.destino);
  }

  // Fechamento mensal: o placar do mês passado. Só calcula quando a tela está aberta.
  const mesFechado = mesParaFechar(hoje());
  const placar = useMemo(
    () => ((rota === 'fechamento' || rota === 'checkin') && entradaDoMotor ? fecharMes(entradaDoMotor, mesFechado) : null),
    [rota, entradaDoMotor, mesFechado],
  );
  const checkin = useMemo(() => (rota === 'checkin' && entradaDoMotor ? fazerCheckin(entradaDoMotor) : null), [rota, entradaDoMotor]);
  const [pagamentosSeparados, setPagamentosSeparados] = useState<string[]>([]);
  useEffect(() => { void lerAjuste<string[]>('pagamentos-separados').then((l) => setPagamentosSeparados(l ?? [])); }, []);
  function separeiOPagamento() {
    const lista = [...pagamentosSeparados, mes];
    setPagamentosSeparados(lista);
    void gravarAjuste('pagamentos-separados', lista);
  }
  const [fechamentosComAporte, setFechamentosComAporte] = useState<string[]>([]);
  const [ultimoBackup, setUltimoBackup] = useState<string | undefined>();
  useEffect(() => {
    void lerAjuste<string[]>('fechamentos-com-aporte').then((l) => setFechamentosComAporte(l ?? []));
    void lerAjuste<string>('ultimo-backup').then(setUltimoBackup);
  }, []);
  function virarAporte() {
    if (!placar?.aporteExtra) return;
    const { metaId, valor } = placar.aporteExtra;
    const meta = metas.find((m) => m.id === metaId);
    if (!meta) return;
    const atualizada = { ...meta, valorAtual: meta.valorAtual + valor };
    setMetas((atuais) => atuais.map((m) => (m.id === metaId ? atualizada : m)));
    void salvarMeta(atualizada);
    const lista = [...fechamentosComAporte, placar.mes];
    setFechamentosComAporte(lista);
    void gravarAjuste('fechamentos-com-aporte', lista);
  }

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

  async function salvar(lancamento: Lancamento, demais: Lancamento[] = []) {
    if (pendenteAberto) {
      await salvarPendenteComoLancamento(pendenteAberto.id, lancamento, demais);
      await relerPendentes();
    } else {
      await salvarLancamento(lancamento);
      for (const parcela of demais) await salvarLancamento(parcela);
      // A Categoria escolhida para a Loja vira Regra de estabelecimento.
      await gravarRegra(lancamento.loja, lancamento.categoriaId);
    }
    setFolha(null);
    await recarregar();
  }

  // Desfazer: guarda o que acabou de apagar por 5 segundos.
  const [apagados, setApagados] = useState<{ lista: Lancamento[]; chave: number } | null>(null);
  async function apagar(id: string) {
    const lista = await apagarComSeguintes(id);
    if (lista.length > 0) setApagados((atual) => ({ lista, chave: (atual?.chave ?? 0) + 1 }));
    setFolha(null);
    await recarregar();
  }
  async function desfazerApagar() {
    if (!apagados) return;
    await restaurarLancamentos(apagados.lista);
    setApagados(null);
    await recarregar();
  }
  const expirarDesfazer = useCallback(() => setApagados(null), []);

  const idDoPendenteAberto = pendenteAberto?.id;
  const fechar = useCallback(() => setFolha(null), []);

  // Instalar antes de começar (ADR 0002): no Safari do iPhone os dados não passam para o app instalado.
  const mostraInstalacao = rota === 'instalar' || (instalacaoDispensada === false && rota !== 'backup');
  if (precisaDeInstalacao && instalacaoDispensada === null && rota !== 'backup' && rota !== 'instalar') return null;
  if (precisaDeInstalacao && mostraInstalacao) {
    return (
      <ProvedorDiscreto ligado={discreto !== false}>
        <Instalar temDados={onboarding != null || recentes.length > 0} onExportar={() => navegar('backup')}
          onContinuar={() => {
            setInstalacaoDispensada(true);
            void gravarAjuste('instalacao-dispensada', true);
            navegar(rota === 'instalar' ? 'ajustes' : rota, true);
          }} />
      </ProvedorDiscreto>
    );
  }

  return (
    <ProvedorDiscreto ligado={discreto !== false}>
      {rota === 'ajustes' && (
        <Ajustes discreto={discreto === true} onAlternarDiscreto={alternarDiscreto} aparencia={aparencia} onMudarAparencia={mudarAparencia} podeInstalar={precisaDeInstalacao} quantidadeDeFixos={fixos.length}
          categoriasPadrao={todas.length - proprias.length} categoriasProprias={proprias.length}
          resumoDosParametros={resumoDosParametros(parametros.valores)}
          resumoDoBackup={ultimoBackup ? `Último há ${Math.max(0, Math.round((Date.parse(hoje()) - Date.parse(ultimoBackup)) / 86400000))} dias` : 'Você ainda não exportou'} />
      )}
      {rota === 'fechamento' && placar && (
        <Fechamento placar={placar} temDados={recentes.some((l) => mesDe(l.data) === mesFechado)}
          nomeDaCategoria={(id) => todas.find((c) => c.id === id)?.nome ?? 'Outros'}
          assinaturasParecidas={(() => {
            const parecidas = (saida?.recorrentes ?? []).filter((r) => r.duplicada);
            return parecidas.length > 1 ? { quantidade: parecidas.length, custoAnual: parecidas.reduce((s, r) => s + r.custoAnual, 0) } : null;
          })()}
          diasDesdeOBackup={ultimoBackup ? Math.max(0, Math.round((Date.parse(hoje()) - Date.parse(ultimoBackup)) / 86400000)) : null}
          aporteFeito={fechamentosComAporte.includes(placar.mes)} onVirarAporte={virarAporte} />
      )}
      {rota === 'checkin' && checkin && (
        <CheckIn checkin={checkin} nomeDaCategoria={(id) => todas.find((c) => c.id === id)?.nome ?? 'Outros'}
          onEditar={(l) => setFolha({ tipo: 'editar', lancamento: l })}
          salvoDoMesPassado={placar && !placar.mesZero && placar.dinheiroSalvo > 0 ? placar : null}
          aporteFeito={placar ? fechamentosComAporte.includes(placar.mes) : false} onVirarAporte={virarAporte} />
      )}
      {rota === 'dia-do-pagamento' && saida && (
        <DiaDoPagamento mes={mes} hoje={hoje()} diaDoSalario={onboarding?.diaDoSalario} guardarPorMes={saida.plano.guardarPorMes} aportes={saida.metas.escada}
          jaSeparou={pagamentosSeparados.includes(mes)} onSeparei={separeiOPagamento} />
      )}
      {rota === 'lembretes' && <Lembretes diaDoSalario={onboarding?.diaDoSalario} />}
      {rota === 'backup' && (
        <Backup hoje={hoje()} ultimoBackup={ultimoBackup} onExportou={() => { void registrarBackupFeito(hoje()); setUltimoBackup(hoje()); }} />
      )}
      {rota === 'calendario' && calendario && <Calendario calendario={calendario} hoje={hoje()} />}
      {rota === 'parametros' &&<Parametros salvos={parametros} hoje={hoje()} onSalvar={salvarParametros} />}
      {rota === 'metas' && saida && (
        <Metas plano={saida.metas} metas={metas} renda={saida.diagnostico.renda} temDividas={saida.dividas !== null} dicas={saida.dicas} investimento={saida.investimento}
          onSalvar={(m) => { setMetas((atuais) => [...atuais.filter((x) => x.id !== m.id), m]); void salvarMeta(m); }}
          onApagar={(id) => { setMetas((atuais) => atuais.filter((x) => x.id !== id)); void apagarMeta(id); }} />
      )}
      {rota === 'ese' && entradaDoMotor && (
        <EseSim entrada={entradaDoMotor} metas={metas} categorias={todas} onAplicar={(cenario) => {
          const { ajustes, metas: novas } = aplicarCenario(entradaDoMotor, cenario);
          setAjustesDoPlano(ajustes);
          void gravarAjuste('ajustes-do-plano', ajustes);
          setMetas(novas);
          for (const n of novas) if (n !== metas.find((m) => m.id === n.id)) void salvarMeta(n);
          navegar('metas');
        }} />
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
        <TelaFatura previsao={saida?.previsao ?? null} evolucao={saida?.evolucao ?? null} cartao={cartao} categorias={todas}
          onSalvarCartao={(c) => { setCartao(c); void gravarAjuste('cartao', c); }} />
      )}
      {rota === 'assinaturas' && <Assinaturas recorrentes={saida?.recorrentes ?? []} />}
      {rota === 'fixos' && (
        <Fixos fixos={fixos} mes={mes} categorias={visiveis}
          onSalvar={(f) => { setFixos((atuais) => [...atuais.filter((x) => x.id !== f.id), f]); void salvarFixo(f); }} />
      )}
      {rota === 'onboarding' && onboarding !== null && (
        <Onboarding inicial={onboarding} categorias={visiveis} salarioMinimo={parametros.valores.salarioMinimo}
          onConcluir={(r) => void concluirOnboarding(r)} onSair={() => navegar(onboarding ? 'ajustes' : 'inicio')} />
      )}
      {rota === 'diagnostico' && saida && (
        <Diagnostico diagnostico={saida.diagnostico} onVoltar={() => navegar('inicio')} onContinuar={() => navegar('inicio')} />
      )}
      {rota === 'diagnostico' && onboarding === undefined && (
        <Onboarding categorias={visiveis} salarioMinimo={parametros.valores.salarioMinimo}
          onConcluir={(r) => void concluirOnboarding(r)} onSair={() => navegar('inicio')} />
      )}
      {rota === 'atalho' && <Atalho />}
      {rota === 'categorias' && (
        <Categorias todas={todas} escondidas={escondidas} onAlternarEscondida={alternarEscondida}
          onCriar={(nome, grupo) => void criarCategoria(nome, grupo)} onRenomear={renomearCategoria} onApagar={apagarCategoria} />
      )}
      {(rota === 'inicio' || rota === 'lancar') && (
        <Inicio mes={mes} lancamentos={lancamentos} categorias={todas} onAlternarDiscreto={alternarDiscreto}
          atualizacao={folhaAberta ? null : atualizacao}
          semPlano={onboarding === undefined} onMontarPlano={() => navegar('onboarding')}
          plano={saida?.plano ?? null} metas={metasNaHome} onMetas={() => navegar('metas')}
          previsao={saida?.previsao ?? null} onFatura={() => navegar('fatura')} avisos={saida?.avisos ?? []}
          comprasParaLembrar={paraLembrar} onResolverCompra={resolverCompra} onPossoComprar={() => navegar('posso-comprar')} onCalendario={() => navegar('calendario')} onFecharMes={() => navegar('fechamento')} onCheckin={() => navegar('checkin')} capi={capiDeHoje} onCapi={abrirCapi}
          onLancar={() => setFolha({ tipo: 'novo' })} onEditar={(l) => setFolha({ tipo: 'editar', lancamento: l })} />
      )}
      {ehAba(rota) && <BarraDeBaixo ativa={rota} onLancar={() => setFolha({ tipo: 'novo' })} />}
      {apagados && !folhaAberta && <AvisoDeDesfazer chave={apagados.chave} onDesfazer={() => void desfazerApagar()} onExpirar={expirarDesfazer} />}
      {folhaAberta && (
        <NovoGasto plano={saida?.plano ?? null} key={folhaAberta.tipo === 'editar' ? folhaAberta.lancamento.id : (idDoPendenteAberto ?? 'novo')} categorias={visiveis} regras={regras}
          onCriarCategoria={criarCategoria}
          editando={folhaAberta.tipo === 'editar' ? folhaAberta.lancamento : undefined}
          preenchimento={folhaAberta.tipo === 'novo' ? folhaAberta.preenchimento : undefined}
          outrosPendentes={pendenteAberto ? pendentesDoAtalho.length - 1 : 0}
          onDescartar={pendenteAberto ? async () => {
            await descartarPendenteDoAtalho(pendenteAberto.id);
            await relerPendentes();
          } : undefined}
          onSalvar={salvar} onApagar={apagar} onFechar={fechar} />
      )}
    </ProvedorDiscreto>
  );
}
