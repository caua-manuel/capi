import { useEffect } from 'react';

export const SEGUNDOS_PARA_DESFAZER = 5;

interface Props {
  /** Muda a cada apagada, para a contagem de 5 segundos recomeçar. */
  chave: number;
  onDesfazer: () => void;
  onExpirar: () => void;
}

/** "Gasto apagado · Desfazer", por 5 segundos, acima da barra de baixo. Não mostra valores. */
export function AvisoDeDesfazer({ chave, onDesfazer, onExpirar }: Props) {
  useEffect(() => {
    const t = window.setTimeout(onExpirar, SEGUNDOS_PARA_DESFAZER * 1000);
    return () => window.clearTimeout(t);
  }, [chave, onExpirar]);
  return (
    <div className="aviso-desfazer" role="status" aria-live="polite">
      <span>Gasto apagado</span>
      <button type="button" className="link" onClick={onDesfazer}>Desfazer</button>
    </div>
  );
}
