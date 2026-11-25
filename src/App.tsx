import { useCallback, useEffect, useState } from 'react';
import { CATEGORIAS_PADRAO } from './dominio/categorias';
import type { Lancamento } from './dominio/lancamento';
import type { RegrasDeEstabelecimento } from './leitor/leitor';
import { apagarLancamento, listarLancamentosDoMes, salvarLancamento } from './repositorio/lancamentos';
import { gravarRegra, lerRegras } from './repositorio/regras';
import { Inicio } from './telas/Inicio';
import { NovoGasto, type PreenchimentoDoGasto } from './telas/NovoGasto';
import { hoje, mesDe } from './telas/formato';

type Folha = { tipo: 'novo'; preenchimento?: PreenchimentoDoGasto } | { tipo: 'editar'; lancamento: Lancamento } | null;

export function App() {
  const mes = mesDe(hoje());
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [regras, setRegras] = useState<RegrasDeEstabelecimento>({});
  const [folha, setFolha] = useState<Folha>(null);
  const categorias = CATEGORIAS_PADRAO;

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
      <Inicio mes={mes} lancamentos={lancamentos} categorias={categorias}
        onLancar={() => setFolha({ tipo: 'novo' })} onEditar={(l) => setFolha({ tipo: 'editar', lancamento: l })} />
      {folha && (
        <NovoGasto key={folha.tipo === 'editar' ? folha.lancamento.id : 'novo'} categorias={categorias} regras={regras}
          editando={folha.tipo === 'editar' ? folha.lancamento : undefined}
          preenchimento={folha.tipo === 'novo' ? folha.preenchimento : undefined}
          onSalvar={salvar} onApagar={apagar} onFechar={fechar} />
      )}
    </>
  );
}
