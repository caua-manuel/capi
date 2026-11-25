import { useState } from 'react';
import { CampoDinheiro } from '../componentes/CampoDinheiro';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import type { Centavos } from '../motor/dinheiro';
import { PARAMETROS_PADRAO, type Parametros as TabelaDeParametros } from '../motor/parametros';
import { parametrosPadraoSalvos, type ParametrosSalvos } from '../repositorio/parametros';
import { Valor } from './discreto';
import { navegar } from './rotas';

interface Props {
  salvos: ParametrosSalvos;
  hoje: string;
  onSalvar: (novos: ParametrosSalvos) => void;
}

interface Linha {
  chave: string;
  rotulo: string;
  ajuda: string;
  tipo: 'pct' | 'dinheiro';
  ler: (p: TabelaDeParametros) => number;
  gravar: (p: TabelaDeParametros, v: number) => TabelaDeParametros;
}

const ir = (campo: keyof TabelaDeParametros['irRendaFixa']) => (p: TabelaDeParametros, v: number) => ({ ...p, irRendaFixa: { ...p.irRendaFixa, [campo]: v } });

const LINHAS: Linha[] = [
  { chave: 'selicAnual', rotulo: 'Selic', ajuda: 'ao ano', tipo: 'pct', ler: (p) => p.selicAnual, gravar: (p, v) => ({ ...p, selicAnual: v }) },
  { chave: 'cdiAnual', rotulo: 'CDI', ajuda: 'ao ano', tipo: 'pct', ler: (p) => p.cdiAnual, gravar: (p, v) => ({ ...p, cdiAnual: v }) },
  { chave: 'iofInternacional', rotulo: 'IOF em compras internacionais', ajuda: 'no cartão', tipo: 'pct', ler: (p) => p.iofInternacional, gravar: (p, v) => ({ ...p, iofInternacional: v }) },
  { chave: 'ir180', rotulo: 'IR da renda fixa até 180 dias', ajuda: 'sobre o rendimento', tipo: 'pct', ler: (p) => p.irRendaFixa.ate180Dias, gravar: ir('ate180Dias') },
  { chave: 'ir360', rotulo: 'IR de 181 a 360 dias', ajuda: 'sobre o rendimento', tipo: 'pct', ler: (p) => p.irRendaFixa.ate360Dias, gravar: ir('ate360Dias') },
  { chave: 'ir720', rotulo: 'IR de 361 a 720 dias', ajuda: 'sobre o rendimento', tipo: 'pct', ler: (p) => p.irRendaFixa.ate720Dias, gravar: ir('ate720Dias') },
  { chave: 'ir720mais', rotulo: 'IR acima de 720 dias', ajuda: 'sobre o rendimento', tipo: 'pct', ler: (p) => p.irRendaFixa.acima720Dias, gravar: ir('acima720Dias') },
  { chave: 'salarioMinimo', rotulo: 'Salário mínimo', ajuda: 'por mês', tipo: 'dinheiro', ler: (p) => p.salarioMinimo, gravar: (p, v) => ({ ...p, salarioMinimo: v }) },
  { chave: 'rendimentoMensalConservador', rotulo: 'Rendimento das Metas', ajuda: 'ao mês, líquido de IR', tipo: 'pct', ler: (p) => p.rendimentoMensalConservador, gravar: (p, v) => ({ ...p, rendimentoMensalConservador: v }) },
  { chave: 'poupancaMensal', rotulo: 'Poupança', ajuda: 'ao mês', tipo: 'pct', ler: (p) => p.poupancaMensal, gravar: (p, v) => ({ ...p, poupancaMensal: v }) },
];

const formatarPct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

function doTexto(t: string): number | null {
  const n = Number(t.replace(/\s/g, '').replace('%', '').replace(/\./g, '').replace(',', '.'));
  return t.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 1000 ? n / 100 : null;
}

const ddmmaaaa = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/** Resumo para a linha em Ajustes. */
export function resumoDosParametros(p: TabelaDeParametros): string {
  return `Selic ${formatarPct(p.selicAnual)} · IOF ${formatarPct(p.iofInternacional)}`;
}

function Editor({ linha, valor, onSalvar, onCancelar }: { linha: Linha; valor: number; onSalvar: (v: number) => void; onCancelar: () => void }) {
  const [texto, setTexto] = useState((valor * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }));
  const [dinheiro, setDinheiro] = useState<Centavos | null>(valor);
  const novo = linha.tipo === 'pct' ? doTexto(texto) : dinheiro;
  return (
    <div className="linha-form" style={{ padding: '4px 0 12px' }}>
      {linha.tipo === 'pct' ? (
        <label className="rotulo">{linha.rotulo} (%)
          <input className="seletor num" inputMode="decimal" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
      ) : (
        <CampoDinheiro id={`param-${linha.chave}`} rotulo={linha.rotulo} valor={dinheiro} onMudar={setDinheiro} />
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="chip" style={{ flex: 1 }} onClick={onCancelar}>Cancelar</button>
        <button type="button" className="chip" aria-pressed="true" style={{ flex: 1 }} disabled={novo === null}
          onClick={() => novo !== null && onSalvar(novo)}>Salvar</button>
      </div>
    </div>
  );
}

export function Parametros({ salvos, hoje, onSalvar }: Props) {
  const [editando, setEditando] = useState<string | null>(null);
  const dataDe = (chave: string) => salvos.datas[chave] ?? PARAMETROS_PADRAO.atualizadoEm;

  function gravar(linha: Linha, v: number) {
    const valores = linha.gravar(salvos.valores, v);
    onSalvar({ valores: { ...valores, atualizadoEm: hoje }, datas: { ...salvos.datas, [linha.chave]: hoje } });
    setEditando(null);
  }

  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Parâmetros" linha2="de mercado" onVoltar={() => navegar('ajustes')} />
      <Folha>
        <p className="texto-2" style={{ margin: '0 8px 12px' }}>
          Valores que mudam com o mercado. O Plano e as datas das Metas se recalculam com o que estiver aqui.
        </p>
        <section className="grupo-cartao" aria-label="Parâmetros">
          {LINHAS.map((linha, i) => {
            const valor = linha.ler(salvos.valores);
            const aberta = editando === linha.chave;
            return (
              <div key={linha.chave} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--ln)' }}>
                <button type="button" className="linha-ajuste" aria-expanded={aberta}
                  onClick={() => setEditando(aberta ? null : linha.chave)}>
                  <span className="ajuste-texto">
                    <span className="ajuste-titulo">{linha.rotulo}</span>
                    <span className="ajuste-sub">{linha.ajuda} · atualizado em {ddmmaaaa(dataDe(linha.chave))}</span>
                  </span>
                  <span className="num" style={{ fontWeight: 600 }}>
                    {linha.tipo === 'pct' ? formatarPct(valor) : <Valor centavos={valor} />}
                  </span>
                </button>
                {aberta && <Editor linha={linha} valor={valor} onSalvar={(v) => gravar(linha, v)} onCancelar={() => setEditando(null)} />}
              </div>
            );
          })}
        </section>
        <button type="button" className="link" style={{ width: 'auto', margin: '12px 0 0 8px' }}
          onClick={() => onSalvar(parametrosPadraoSalvos())}>Voltar aos valores padrão</button>
        <p className="rotulo" style={{ margin: '12px 8px 0', color: 'var(--tx3)' }}>
          Este plano é educativo e não é recomendação de investimento.
        </p>
      </Folha>
    </main>
  );
}
