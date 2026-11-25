import { useState } from 'react';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import type { Divida } from '../dominio/onboarding';
import type { AnaliseDasDividas, Metodo, Quitacao } from '../motor/dividas';
import { Valor, useModoDiscreto } from './discreto';
import { formatarReais } from './formato';
import { navegar } from './rotas';

interface Props {
  analise: AnaliseDasDividas;
  dividas: readonly Divida[];
}

const NOME_DO_METODO: Record<Metodo, string> = { avalanche: 'Avalanche', 'bola-de-neve': 'Bola de neve' };
const meses = (n: number | null) => (n === null ? 'mais de 50 anos' : n === 1 ? '1 mês' : `${n} meses`);

/** Texto pronto para mandar ao credor. Valores em R$ só aqui, na Tela. */
function textoDeRenegociacao(a: AnaliseDasDividas, nome: string, trocarRotativo: boolean): string {
  const partes = [
    `Olá. Quero negociar a dívida de ${nome}.`,
    `Hoje consigo pagar até ${formatarReais(a.renegociacao.podePagarPorMes)} por mês, somando todas as minhas dívidas.`,
    'Gostaria de saber qual desconto vocês oferecem para pagamento à vista.',
  ];
  if (trocarRotativo) partes.push('Também peço a troca do rotativo por um parcelamento com juros menores.');
  partes.push('Podem me mandar a proposta por escrito, com o valor total e os juros ao mês?');
  return partes.join(' ');
}

function Coluna({ metodo, q, recomendado }: { metodo: Metodo; q: Quitacao; recomendado: boolean }) {
  return (
    <div className="coluna-gelo">
      <span className="rotulo">{NOME_DO_METODO[metodo]}{recomendado ? ' · indicado' : ''}</span>
      <span className="num valor-gelo">{meses(q.meses)}</span>
      <span className="rotulo">juros: <Valor centavos={q.jurosTotais} semCentavos /></span>
    </div>
  );
}

export function Dividas({ analise: a, dividas }: Props) {
  const discreto = useModoDiscreto();
  const [copiado, setCopiado] = useState<string | null>(null);
  const nome = (id: string) => dividas.find((d) => d.id === id)?.nome ?? id;
  const escolhido = a.recomendado === 'avalanche' ? a.avalanche : a.bolaDeNeve;

  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Suas dívidas" linha2="avalanche x bola de neve" onVoltar={() => navegar('metas')} />
      <Folha>
        <section className="cartao-gelo" style={{ margin: 0 }} aria-label="Comparação">
          <Coluna metodo="avalanche" q={a.avalanche} recomendado={a.recomendado === 'avalanche'} />
          <Coluna metodo="bola-de-neve" q={a.bolaDeNeve} recomendado={a.recomendado === 'bola-de-neve'} />
        </section>

        <section className="cartao" style={{ margin: '12px 0 0' }}>
          <h2 className="titulo">{a.recomendado === 'avalanche' ? 'Maior juros primeiro' : 'Menor saldo primeiro'}</h2>
          <p className="texto-2" style={{ margin: '4px 0 0' }}>
            {a.diferencaEmReais === 0 && a.diferencaEmMeses === 0
              ? <>Aqui os dois métodos dão o mesmo resultado.</>
              : a.recomendado === 'avalanche'
              ? <>A avalanche paga <Valor centavos={Math.max(0, a.diferencaEmReais)} semCentavos /> a menos de juros{a.diferencaEmMeses > 0 ? ` e termina ${meses(a.diferencaEmMeses)} antes` : ''}.</>
              : <>Com 3 ou mais dívidas pequenas, quitar as menores primeiro dá vitórias rápidas. Custa <Valor centavos={Math.max(0, a.diferencaEmReais)} semCentavos /> a mais de juros.</>}
          </p>
          <p className="rotulo" style={{ margin: '8px 0 0' }}>
            Pagando <Valor centavos={a.renegociacao.podePagarPorMes} semCentavos /> por mês (parcelas + <Valor centavos={a.extraPorMes} semCentavos /> de extra).
          </p>
          <ol className="lista-categorias" style={{ paddingLeft: 0 }}>
            {escolhido.ordem.map((id, i) => (
              <li key={id} className="linha-categoria">
                <span>{i + 1}. {nome(id)}</span>
                <span className="rotulo">{escolhido.quitacao[id] ? `quita em ${meses(escolhido.quitacao[id]!)}` : 'não quita no ritmo atual'}</span>
              </li>
            ))}
          </ol>
          {escolhido.meses === null && (
            <p className="rotulo" style={{ margin: '8px 0 0', color: 'var(--bad)' }}>Com o que dá para pagar hoje, os juros crescem mais que os pagamentos. Renegociar é o primeiro passo.</p>
          )}
        </section>

        {a.renegociacao.credores.length > 0 && (
          <section className="cartao" style={{ margin: '12px 0 0' }}>
            <h2 className="titulo">Texto para renegociar</h2>
            {a.renegociacao.credores.map((c) => {
              const texto = textoDeRenegociacao(a, c.nome, c.trocarRotativo);
              return (
                <div key={c.dividaId} style={{ marginTop: 10 }}>
                  <p className="texto-2" style={{ margin: 0 }}>{discreto ? 'Desligue o modo discreto para ver o texto.' : texto}</p>
                  <button type="button" className="chip" style={{ marginTop: 8 }}
                    onClick={() => { void navigator.clipboard?.writeText(texto); setCopiado(c.dividaId); }}>
                    {copiado === c.dividaId ? 'Copiado' : `Copiar texto para ${c.nome}`}
                  </button>
                </div>
              );
            })}
          </section>
        )}

        {a.apertoGrave && (
          <section className="cartao status estado-atencao" style={{ margin: '12px 0 0' }}>
            <span className="rotulo-status">Onde buscar ajuda</span>
            <p className="texto-2" style={{ margin: '6px 0 0' }}>
              Para renegociar: {a.ajuda.slice(0, 3).join(', ')}. Orientação gratuita: {a.ajuda[3]} e núcleos de educação financeira.
            </p>
          </section>
        )}
        <p className="rotulo" style={{ textAlign: 'center', margin: '16px 8px 0', color: 'var(--tx3)' }}>
          Simulação educativa com os juros que você informou. Confira as condições com o credor.
        </p>
      </Folha>
    </main>
  );
}
