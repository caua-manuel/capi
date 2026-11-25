import { useCallback, useEffect, useState } from 'react';
import { CATEGORIAS_PADRAO } from './dominio/categorias';
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
  const categorias = CATEGORIAS_PADRAO;

  useEffect(() => {
    // Depois de ler a URL de entrada, o endereço volta para a Início.
    if (rotaAtual() === 'lancar') navegar('inicio', true);
    const aoNavegar = () => setRota(rotaAtual());
    window.addEventListener('popstate', aoNavegar);
    return () => window.removeEventListener('popstate', aoNavegar);
  }, []);

  const recarregar = useCallback(async () => {
    const [lista, r] = await Promise.all([listarLancamentosDoMes(mes), lerRegras()]);
    setLancamentos(lista);
    setRegras(r);
  }, [mes]);

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
    <>
      {rota === 'ajustes' && <Ajustes />}
      {rota === 'atalho' && <Atalho />}
      {(rota === 'inicio' || rota === 'lancar' || rota === 'categorias') && (
        <Inicio mes={mes} lancamentos={lancamentos} categorias={categorias} onAjustes={() => navegar('ajustes')}
          onLancar={() => setFolha({ tipo: 'novo' })} onEditar={(l) => setFolha({ tipo: 'editar', lancamento: l })} />
      )}
      {folha && (
        <NovoGasto key={folha.tipo === 'editar' ? folha.lancamento.id : 'novo'} categorias={categorias} regras={regras}
          editando={folha.tipo === 'editar' ? folha.lancamento : undefined}
          preenchimento={folha.tipo === 'novo' ? folha.preenchimento : undefined}
          onSalvar={salvar} onApagar={apagar} onFechar={fechar} />
      )}
    </>
  );
}
