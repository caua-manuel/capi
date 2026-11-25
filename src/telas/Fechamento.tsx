import type { PlacarDoMes } from '../motor/fechamento';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import { Icone } from '../componentes/Icone';
import { Valor } from './discreto';
import { nomeDoMes } from './formato';
import { navegar } from './rotas';

interface Props {
  placar: PlacarDoMes;
  /** O mês fechado tem Lançamentos? Sem eles não há placar. */
  temDados: boolean;
  nomeDaCategoria: (id: string) => string;
  /** Assinaturas parecidas detectadas, com o custo por ano. */
  assinaturasParecidas: { quantidade: number; custoAnual: number } | null;
  /** Quantos dias desde o último backup; nulo se nunca exportou. */
  diasDesdeOBackup: number | null;
  aporteFeito: boolean;
  onVirarAporte: () => void;
}

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function Fechamento({ placar, temDados, nomeDaCategoria, assinaturasParecidas, diasDesdeOBackup, aporteFeito, onVirarAporte }: Props) {
  const mes = maiuscula(nomeDoMes(placar.mes));
  const proximo = nomeDoMes(placar.proximoMes);
  const estourou = placar.excesso > 0;
  const plano = placar.proximoPlano;

  if (!temDados) {
    return (
      <main className="tela tela-detalhe">
        <Cabecalho linha1={`${mes}`} linha2="ainda sem gastos" onVoltar={() => navegar('inicio')} capi="capi-caderno.png" />
        <Folha>
          <section className="cartao" style={{ margin: 0 }}>
            <h2 className="titulo">Ainda não tenho o que fechar</h2>
            <p className="texto-2" style={{ margin: '4px 0 0' }}>
              Quando houver gastos de {nomeDoMes(placar.mes)}, eu mostro o placar do mês e o plano de {proximo}.
            </p>
          </section>
        </Folha>
      </main>
    );
  }

  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1={mes} linha2="fechado" onVoltar={() => navegar('inicio')} capi={estourou ? 'capi-recomeco.png' : 'capi-festa.png'} />
      <Folha>
        {placar.mesZero ? (
          <section className="cartao" style={{ margin: 0 }}>
            <h2 className="titulo">Mês 0: o primeiro mês não tem Tetos</h2>
            <p className="texto-2" style={{ margin: '4px 0 0' }}>
              Usei seus gastos de {nomeDoMes(placar.mes)} para criar os Tetos de {proximo}. A partir daí o placar conta quantas Categorias ficam no Teto.
            </p>
          </section>
        ) : (
          <section className="cartao-gelo bloco-placar" aria-label="Placar do mês">
            <span className="num placar-numero">{placar.categoriasNoTeto} de {placar.totalDeCategorias}</span>
            <span className="texto-2">categorias dentro do teto</span>
          </section>
        )}

        {estourou && (
          <section className="cartao" style={{ margin: '12px 0 0' }} aria-label="Mês acima do plano">
            <h2 className="titulo">Passou <Valor centavos={placar.excesso} /> do plano</h2>
            <p className="texto-2" style={{ margin: '4px 0 0' }}>
              Nada se apaga. {placar.estouradas.length > 0 && <>Mais pesado: {placar.estouradas.map((c) => nomeDaCategoria(c.categoriaId)).join(', ')}. </>}
              {placar.impactoNasMetas
                ? <>Isso adia {placar.impactoNasMetas.metaNome} em cerca de {placar.impactoNasMetas.diasDeAtraso} dias. </>
                : null}
              O plano de {proximo} já considera o que aconteceu.
            </p>
          </section>
        )}

        {placar.dinheiroSalvo > 0 && (
          <section className="cartao" style={{ margin: '12px 0 0' }} aria-label="Dinheiro salvo">
            <div className="rotulo">Dinheiro salvo abaixo do teto</div>
            <div className="num titulo" style={{ fontSize: 26, marginTop: 2 }}><Valor centavos={placar.dinheiroSalvo} /></div>
            {placar.aporteExtra && (
              <>
                <p className="texto-2" style={{ margin: '6px 0 12px' }}>
                  Como Aporte de {placar.aporteExtra.metaNome}, ela chega {placar.aporteExtra.semanasAntes > 0 ? `${placar.aporteExtra.semanasAntes} ${placar.aporteExtra.semanasAntes === 1 ? 'semana' : 'semanas'} antes` : 'na mesma data, com folga maior'}.
                </p>
                <button type="button" className="chip" aria-pressed={!aporteFeito} disabled={aporteFeito} onClick={onVirarAporte}>
                  {aporteFeito ? 'Aporte feito' : `Virar aporte de ${placar.aporteExtra.metaNome}`}
                </button>
              </>
            )}
          </section>
        )}

        {assinaturasParecidas && (
          <section className="cartao" style={{ margin: '12px 0 0' }}>
            <p style={{ margin: 0 }}>
              <b>{assinaturasParecidas.quantidade} assinaturas parecidas</b>: <span className="num"><Valor centavos={assinaturasParecidas.custoAnual} semCentavos /></span> por ano. Ainda usa todas?
            </p>
          </section>
        )}

        <section className="cartao" style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 12 }} aria-label="Backup">
          <span className="ajuste-icone"><Icone nome="escudo" tamanho={19} traco={1.7} /></span>
          <span className="ajuste-texto">
            <span className="ajuste-titulo">Exportar backup</span>
            <span className="ajuste-sub">{diasDesdeOBackup === null ? 'Você ainda não exportou' : `Último há ${diasDesdeOBackup} ${diasDesdeOBackup === 1 ? 'dia' : 'dias'}`}</span>
          </span>
        </section>

        <section className="cartao" style={{ margin: '12px 0 0' }} aria-label={`Plano de ${proximo}`}>
          <h2 className="titulo">Plano de {proximo}</h2>
          <ul className="lista-compra">
            <li><span>Pode gastar no dia a dia</span><span className="num"><Valor centavos={plano.limiteDoMes} semCentavos /></span></li>
            <li><span>Guardar por mês</span><span className="num"><Valor centavos={plano.guardarPorMes} semCentavos /></span></li>
            <li><span>Tetos por Categoria</span><span className="num">{plano.tetos.length}</span></li>
          </ul>
        </section>

        <div style={{ marginTop: 16 }}>
          <button type="button" className="botao-principal" onClick={() => navegar('inicio')}>
            Ver plano de {proximo}
            <span className="seta"><Icone nome="seta" tamanho={18} traco={2} /></span>
          </button>
        </div>
        <p className="rotulo" style={{ margin: '12px 8px 0', textAlign: 'center', color: 'var(--tx3)' }}>
          Este plano é educativo e não é recomendação de investimento.
        </p>
      </Folha>
    </main>
  );
}
