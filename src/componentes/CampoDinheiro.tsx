import { useState } from 'react';
import type { Centavos } from '../motor/dinheiro';
import { valorEmCentavos } from '../leitor/url';
import { centavosParaTexto } from '../telas/formato';

interface Props {
  id: string;
  rotulo: string;
  valor: Centavos | null;
  onMudar: (valor: Centavos | null) => void;
  /** Valor grande (pergunta principal) ou de linha. */
  grande?: boolean;
}

/** Campo de valor em R$, que aceita "4.000", "4000,50" etc. Guarda sempre centavos. */
export function CampoDinheiro({ id, rotulo, valor, onMudar, grande }: Props) {
  const [texto, setTexto] = useState(valor ? centavosParaTexto(valor).replace(/,00$/, '') : '');
  const [ultimo, setUltimo] = useState(valor);
  // Quando um chip muda o valor de fora, o texto acompanha.
  if (valor !== ultimo) {
    setUltimo(valor);
    if (valor !== valorEmCentavos(texto)) setTexto(valor ? centavosParaTexto(valor).replace(/,00$/, '') : '');
  }
  return (
    <div className={grande ? 'campo-dinheiro grande' : 'campo-dinheiro'}>
      <label htmlFor={id} className="rotulo">{rotulo}</label>
      <div className="campo-dinheiro-linha">
        <span className="num moeda">R$</span>
        <input id={id} className="num" inputMode="decimal" autoComplete="off" placeholder="0" value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            const v = valorEmCentavos(e.target.value);
            setUltimo(v);
            onMudar(v);
          }} />
      </div>
    </div>
  );
}
