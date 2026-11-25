import type { Calendario as CalendarioDoMotor, Compromisso, MesDoCalendario } from '../motor/calendario';
import { Icone } from '../componentes/Icone';
import { Valor } from './discreto';
import { nomeDoMes } from './formato';
import { navegar } from './rotas';

interface Props {
  calendario: CalendarioDoMotor;
  /** AAAA-MM-DD. */
  hoje: string;
}

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const abreviado = (mes: string) => maiuscula(nomeDoMes(mes)).slice(0, 3);
const diaDaSemana = (data: string) => new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

function detalhe(c: Compromisso): string {
  if (c.tipo === 'salario') return 'Entrada';
  if (c.tipo === 'anual') return 'Gasto anual';
  if (c.tipo === 'parcela') return c.parcela ? `Parcela ${c.parcela.atual}/${c.parcela.total}` : 'Parcela';
  if (c.tipo === 'recorrente') return 'Assinatura';
  return 'Fixo';
}

function CartaoDoMes({ m, maior }: { m: MesDoCalendario; maior: number }) {
  const largura = maior > 0 ? Math.round((m.total / maior) * 100) : 0;
  return (
    <div className={m.apertado ? 'mes-resumo apertado' : 'mes-resumo'}>
      <div className="mes-nome">{abreviado(m.mes)}{m.apertado ? ' · aperta' : ''}</div>
      <div className="num mes-total"><Valor centavos={m.total} semCentavos /></div>
      <div className="mes-barra" aria-hidden="true"><div style={{ width: `${largura}%` }} /></div>
    </div>
  );
}

/** Texto do aviso do mês apertado, sempre com os números do Motor. */
function DicaDoMesApertado({ calendario, hoje }: { calendario: CalendarioDoMotor; hoje: string }) {
  const mes = calendario.meses.find((m) => m.apertado);
  if (!mes) return null;
  const anual = mes.compromissos.find((c) => c.tipo === 'anual' && c.caixinha);
  const maior = mes.compromissos.filter((c) => c.tipo !== 'salario').sort((a, b) => b.valor - a.valor)[0];
  const nome = nomeDoMes(mes.mes);
  const mesDeHoje = nomeDoMes(hoje.slice(0, 7));
  return (
    <p className="dica-gelo">
      {anual?.caixinha ? (
        <>
          {maiuscula(nome)} aperta por causa de <b>{anual.nome}</b>. A Caixinha tem <b className="num"><Valor centavos={anual.caixinha.guardado} semCentavos /></b> de{' '}
          <b className="num"><Valor centavos={anual.valor} semCentavos /></b>
          {anual.caixinha.falta > 0 && <>: separe <b className="num"><Valor centavos={anual.caixinha.falta} semCentavos /></b>{mes.mes > hoje.slice(0, 7) ? <> ainda em {mesDeHoje}</> : null}</>}.
        </>
      ) : (
        <>
          {maiuscula(nome)} é o mês mais pesado: <b className="num"><Valor centavos={mes.total} semCentavos /></b> em compromissos
          {maior ? <>, o maior é <b>{maior.nome}</b></> : null}.
        </>
      )}
    </p>
  );
}

/** Tela de número: sem Capi (DESIGN.md). */
export function Calendario({ calendario, hoje }: Props) {
  const maior = Math.max(...calendario.meses.map((m) => m.total));
  const vazio = calendario.meses.every((m) => m.compromissos.every((c) => c.tipo === 'salario'));
  return (
    <main className="tela">
      <header className="topo-simples">
        <button type="button" className="botao-redondo" aria-label="Voltar" onClick={() => navegar('inicio')}><Icone nome="voltar" tamanho={20} /></button>
        <h1 className="titulo">Próximos 3 meses</h1>
        <span style={{ width: 44 }} />
      </header>

      <div className="meses-resumo">
        {calendario.meses.map((m) => <CartaoDoMes key={m.mes} m={m} maior={maior} />)}
      </div>

      <DicaDoMesApertado calendario={calendario} hoje={hoje} />

      {vazio ? (
        <section className="cartao"><p className="texto-2" style={{ margin: 0 }}>Nenhum compromisso nos próximos 3 meses. Cadastre seus Fixos em Ajustes e eles aparecem aqui.</p></section>
      ) : (
        calendario.meses.filter((m) => m.compromissos.length > 0).map((m) => (
          <section key={m.mes} className="cartao" style={{ padding: '14px 18px' }} aria-label={maiuscula(nomeDoMes(m.mes))}>
            <h2 className="titulo" style={{ paddingBottom: 4 }}>{maiuscula(nomeDoMes(m.mes))}</h2>
            <ul className="lista-compromissos">
              {m.compromissos.map((c, i) => (
                <li key={`${c.data}-${c.nome}-${i}`}>
                  <div className="caixa-dia">
                    <span className="num dia">{c.data.slice(8, 10)}</span>
                    <span className="semana">{diaDaSemana(c.data)}</span>
                  </div>
                  <div className="compromisso-texto">
                    <div className="compromisso-nome">{c.nome}</div>
                    <div className="rotulo">
                      {detalhe(c)}
                      {c.caixinha && <> · Caixinha <Valor centavos={c.caixinha.guardado} semCentavos />{c.caixinha.falta > 0 ? <>, faltam <Valor centavos={c.caixinha.falta} semCentavos /></> : null}</>}
                    </div>
                  </div>
                  <span className="num compromisso-valor" style={c.tipo === 'salario' ? { color: 'var(--ok)' } : undefined}>
                    {c.tipo === 'salario' && '+'}<Valor centavos={c.valor} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      <p className="rotulo" style={{ margin: '16px 24px 0', textAlign: 'center', color: 'var(--tx3)' }}>
        Este plano é educativo e não é recomendação de investimento.
      </p>
    </main>
  );
}
