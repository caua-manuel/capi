import { useState } from 'react';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import { enderecoCompleto, navegar, type Rota } from './rotas';

const LEMBRETES: { rota: Rota; titulo: string; quando: string; texto: string }[] = [
  { rota: 'checkin', titulo: 'Check-in', quando: 'Domingo, 20h', texto: 'Ver quanto ainda pode gastar até domingo em cada Categoria.' },
  { rota: 'dia-do-pagamento', titulo: 'Dia do pagamento', quando: 'No dia em que a renda cai', texto: 'Separar o Aporte das Metas antes de gastar.' },
  { rota: 'fechamento', titulo: 'Fechamento mensal', quando: '1 dia depois do fechamento da fatura', texto: 'Ver o placar do mês e o plano do mês seguinte.' },
];

const PASSOS = [
  'Abra o app Atalhos e toque na aba Automação.',
  'Toque em + e escolha Hora do Dia. Marque a hora e o dia (para o Check-in, repita toda semana, no domingo).',
  'Escolha Executar Imediatamente e toque em Avançar.',
  'Toque em Nova Automação em Branco e adicione a ação Mostrar Notificação com o texto do lembrete.',
  'Adicione também a ação Abrir URLs e cole o endereço do ritual (copie abaixo).',
];

function Copiar({ endereco }: { endereco: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(endereco);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <div className="modelo-url">
      <code>{endereco}</code>
      <button type="button" className="chip" onClick={copiar} aria-live="polite">{copiado ? 'Copiado' : 'Copiar endereço'}</button>
    </div>
  );
}

export function Lembretes() {
  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Lembretes" linha2="pelo app Atalhos" onVoltar={() => navegar('ajustes')} />
      <Folha>
        <p className="texto-2" style={{ margin: '0 4px 16px' }}>
          O Capi não manda notificação sozinho. Você cria três lembretes no app Atalhos do iPhone, e cada um abre direto o ritual certo.
        </p>
        <ol className="passos">
          {PASSOS.map((p, i) => (
            <li key={p} className="cartao passo">
              <span className="passo-numero num">{i + 1}</span>
              <p style={{ margin: 0 }}>{p}</p>
            </li>
          ))}
        </ol>
        <h2 className="titulo" style={{ margin: '20px 4px 0' }}>Os 3 lembretes</h2>
        {LEMBRETES.map((l) => (
          <section key={l.rota} className="cartao" style={{ margin: '12px 0 0' }}>
            <h3 className="titulo">{l.titulo}</h3>
            <p className="rotulo" style={{ margin: '2px 0 6px' }}>{l.quando}</p>
            <p style={{ margin: 0 }}>{l.texto}</p>
            <Copiar endereco={enderecoCompleto(l.rota)} />
          </section>
        ))}
        <p className="rotulo" style={{ margin: '12px 8px 0', color: 'var(--tx3)' }}>
          Se o endereço mudar de lugar, os lembretes antigos continuam abrindo o app.
        </p>
      </Folha>
    </main>
  );
}
