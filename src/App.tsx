import { useCallback, useEffect, useMemo, useState } from 'react';
import { criarCategoriaPropria, montarCategorias, type Categoria, type Grupo } from './dominio/categorias';
import { apagarCategoriaPropria, gravarEscondidas, lerEscondidas, listarCategoriasProprias, salvarCategoriaPropria } from './repositorio/categorias';
import { Categorias } from './telas/Categorias';
import { CHAVE_MODO_DISCRETO, ProvedorDiscreto } from './telas/discreto';
import { gravarAjuste, lerAjuste } from './repositorio/ajustes';
import type { Lancamento } from './dominio/lancamento';
import type { RegrasDeEstabelecimento } from './leitor/leitor';
import { lerUrlDeEntrada } from './leitor/url';
import { apagarLancamento, listarLancamentosDoMes, salvarLancamento } from './repositorio/lancamentos';
import { gravarRegra, lerRegras } from './repositorio/regras';
import { Ajustes } from './telas/Ajustes';
import { Atalho } from './telas/Atalho';
import { Inicio } from './telas/Inicio';
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

  const recarregar = useCallback(async () => {
    const [lista, r, p, e] = await Promise.all([listarLancamentosDoMes(mes), lerRegras(), listarCategoriasProprias(), lerEscondidas()]);
    setLancamentos(lista);
    setRegras(r);
    setProprias(p);
    setEscondidas(e);
  }, [mes]);

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
      {rota === 'atalho' && <Atalho />}
      {rota === 'categorias' && (
        <Categorias todas={todas} escondidas={escondidas} onAlternarEscondida={alternarEscondida}
          onCriar={(nome, grupo) => void criarCategoria(nome, grupo)} onRenomear={renomearCategoria} onApagar={apagarCategoria} />
      )}
      {(rota === 'inicio' || rota === 'lancar') && (
        <Inicio mes={mes} lancamentos={lancamentos} categorias={todas} onAjustes={() => navegar('ajustes')} onAlternarDiscreto={alternarDiscreto}
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
