# Motor financeiro do app

Nov 23, 2026 · @Kiwi MKTIP

## Visão geral

O motor transforma respostas curtas e um extrato de fatura em um plano mensal com tetos, metas datadas e avisos. Ele é genérico: qualquer pessoa responde o onboarding e recebe um plano próprio. Os gastos não chegam em tempo real; o usuário importa a fatura (PDF/CSV/texto) ou lança gastos à mão em 2 toques.

Fluxo do usuário:

1. Onboarding (5–8 min): renda, gastos fixos, dívidas, reserva, estabilidade e objetivos.
2. Importar a primeira fatura (opcional, mas recomendado): o app categoriza e detecta recorrentes.
3. Diagnóstico: saúde financeira, regra 50-30-20 ajustada, onde o dinheiro vaza.
4. Plano: tetos por categoria, valor a guardar por mês, ordem das metas e datas previstas.
5. Rotina: lançamentos rápidos, check-in semanal, fechamento mensal com nova fatura.
6. Reajuste: a cada mês o plano recalcula datas e tetos com o que aconteceu de verdade.

Princípio de produto: perguntar só o que muda o plano, aceitar estimativas ("mais ou menos") e mostrar um número útil já na primeira tela.

## Onboarding: perguntas base

São 14 perguntas em 5 blocos; todas aceitam "não sei / estimar". As marcadas com \* são obrigatórias para gerar o primeiro plano.

| # | Pergunta | Tipo de resposta | Por que importa |
| --- | --- | --- | --- |
| 1\* | Quanto cai na sua conta por mês, líquido? | Valor (R$) | Base de todo o orçamento |
| 2\* | Essa renda é fixa ou varia? | Fixa / Varia pouco / Varia muito | Define reserva e uso da média dos 3 piores meses |
| 3\* | Como você trabalha? | CLT / Servidor / PJ ou autônomo / Empresa da família / Estudante / Outro | Define meses de reserva |
| 4 | Tem renda extra (freela, produto, aluguel)? Quanto em média? | Valor + frequência | Regra de destino da renda extra |
| 5\* | Mora com quem e quanto paga de moradia (aluguel, condomínio, contas)? | Sozinho / Família / Parceiro(a) / República + valor | Maior gasto essencial |
| 6\* | Gastos fixos fora do cartão: academia, faculdade, plano de saúde, celular, internet | Lista de itens + valor | Muitos fixos não aparecem na fatura |
| 7 | Tem carro ou moto? | Sim/Não + IPVA, seguro, manutenção anual | Gera a reserva de anuais |
| 8 | Gastos que aparecem 1x por ano: IPVA, IPTU, material, Natal, aniversários, viagens | Lista + valor aproximado | Evita o "mês que estoura" |
| 9\* | Tem dívidas? Para cada: saldo, juros ao mês, parcela, atraso? | Lista ou "nenhuma" | Prioridade absoluta se juros altos |
| 10\* | Quanto tem guardado hoje e onde? | Valor + tipo (poupança, CDB, conta, Tesouro, ações, cripto) | Ponto de partida das metas |
| 11 | Quanto você já guarda por mês, se guarda? | Valor | Mede a taxa de poupança atual |
| 12 | Divide gastos com alguém (namoro, casa, filhos)? Como dividem? | Sozinho / Meio a meio / Proporcional / Eu pago mais | Ajusta tetos de lazer e comida |
| 13\* | Quais são seus objetivos? (múltipla escolha + data) | Ver seção de objetivos | Gera as metas |
| 14 | O que mais te faz gastar sem perceber? | Delivery / Compras online / Saídas / Assinaturas / Pix / Não sei | Personaliza avisos e dicas |

Perguntas de perfil, feitas só quando o objetivo for investir: tolerância a perda ("se seu investimento caísse 20% em um mês, você: venderia / esperaria / compraria mais"), prazo do dinheiro e experiência anterior.

Dica de UX: perguntar 1 por tela, com chips de valores comuns (R$ 1.500, 2.500, 4.000…) e um campo livre. Mostrar o progresso ("faltam 3").

## Perguntas por objetivo

Cada objetivo escolhido no item 13 abre de 2 a 4 perguntas próprias. O usuário pode ter vários ao mesmo tempo; o motor ordena (ver Planos de metas).

| Objetivo | Perguntas extras | O que o motor calcula |
| --- | --- | --- |
| Sair do vermelho / quitar dívidas | Saldo, juros, parcela e atraso de cada dívida; quanto dá para pagar além das parcelas; aceita renegociar? | Ordem de quitação (avalanche e bola de neve), data de quitação, juros economizados, texto de renegociação |
| Montar reserva de emergência | Confirmação do custo de vida mensal; alguém depende de você? | Valor-alvo (meses × custo de vida), aporte mensal, data |
| Juntar um valor (ex.: R$ 20 mil, R$ 100 mil) | Valor, data-alvo, para quê, pode mexer antes? | Aporte mensal necessário com e sem rendimento, data provável no ritmo atual |
| Viagem (ex.: outubro/2027) | Destino, data, número de pessoas, custo estimado ou faixa (econômica/média/conforto), vai dividir? | Custo total com margem de 15%, aporte mensal, alerta de câmbio se internacional |
| Comprar algo (carro, celular, notebook) | Preço, data, à vista ou entrada + parcelas? | Comparativo à vista guardando x parcelado (juros totais), aporte mensal |
| Começar a investir | Reserva já completa? Quanto por mês? Prazo? Perfil (3 perguntas) | Divisão sugerida por prazo, explicação simples dos produtos, primeiro passo |
| Morar sozinho / casar / filho | Data, custo mensal novo previsto (aluguel, contas), custo inicial (móveis, mudança, caução) | Teste: o novo custo cabe em 50% da renda? Valor de largada + reserva maior |
| Organizar o dia a dia (só parar de faltar dinheiro) | Em que semana do mês o dinheiro acaba? | Tetos semanais e saldo diário disponível |
| Aposentadoria / independência | Idade atual, idade-alvo, renda desejada por mês (valor de hoje) | Patrimônio-alvo (renda × 12 / 4%), aporte mensal |

Toda meta tem os mesmos campos no app: nome, valor-alvo, data-alvo, valor atual, prioridade (1–3), ícone e "pode mexer?" (sim/não).

## Diagnóstico: regras e fórmulas

O diagnóstico sai em 4 números e 1 status. Renda variável usa a média dos 3 piores meses dos últimos 6.

**1. Sobra mensal**

```latex
\text{Sobra} = \text{Renda} - (\text{Fixos} + \text{Variáveis} + \text{Parcelas} + \tfrac{\text{Anuais}}{12})
```

**2. Taxa de poupança** = sobra ÷ renda.

**3. Regra 50-30-20 ajustada**: essencial (moradia, contas, mercado, transporte, saúde, educação, parcelas mínimas) até 50%; estilo de vida (comida fora, lazer, compras, assinaturas, Pix sem categoria) até 30%; guardar/quitar pelo menos 20%. Ajustes: quem mora com a família e paga pouca moradia deve mirar 40-20-40 (guardar mais, não gastar mais); renda abaixo de 2 salários mínimos pode começar com 60-30-10 e subir 2 pontos por trimestre.

**4. Meses de fôlego** = reserva atual ÷ custo de vida mensal.

**Status (semáforo)**

| Status | Condição | Mensagem principal |
| --- | --- | --- |
| Vermelho | Sobra negativa, ou dívida com juros acima de 5% ao mês, ou atraso | "Antes de qualquer meta: parar o vazamento e tratar a dívida cara." |
| Amarelo | Sobra entre 0% e 10%, ou reserva abaixo de 1 mês | "Você fecha o mês, mas qualquer imprevisto vira dívida." |
| Verde | Sobra entre 10% e 30% e reserva de pelo menos 1 mês | "Base boa; agora é dar destino ao dinheiro." |
| Azul | Sobra acima de 30% e reserva completa | "Hora de acelerar metas e investir." |

**Meses de reserva recomendados**

| Situação de trabalho | Meses |
| --- | --- |
| Servidor público | 3 |
| CLT com FGTS e seguro-desemprego | 4–6 |
| Empresa da família sem registro, PJ, autônomo | 6–9 |
| Renda muito variável ou dependentes | 9–12 |

**Sinais de alerta** que o diagnóstico destaca: estilo de vida acima de 35%; gasto real acima do declarado no onboarding (comparar com a fatura); mais de 15 compras pequenas (abaixo de R$ 30) por mês na mesma categoria; assinaturas acima de 8% da renda; uso de rotativo ou parcelamento de fatura; fatura crescendo 3 meses seguidos.

## Categorização do extrato e recorrentes

Ao importar a fatura, o motor ignora "Pagamento de fatura" e estornos, separa IOF e classifica cada linha por palavras-chave; o que não casar vai para "Revisar" e o usuário escolhe a categoria 1 vez (a escolha vira regra para aquele estabelecimento).

| Categoria | Grupo 50-30-20 | Palavras-chave de exemplo |
| --- | --- | --- |
| Mercado | Essencial | mercado, supermercado, atacad, hortifruti, pão de açúcar, guanabara, assaí |
| Combustível | Essencial | posto, auto posto, shell, ipiranga, br mania |
| Transporte | Essencial | uber, 99 ride, 99app, metrô, bilhete |
| Estacionamento/pedágio | Essencial | park, estacionamento, sem parar, conectcar, pedágio |
| Saúde | Essencial | drogaria, farma, clínica, laboratório, hospital |
| Educação | Essencial | faculdade, curso, udemy, alura, livraria |
| Contas da casa | Essencial | luz, energia, água, gás, internet, claro, vivo, tim |
| Comida fora | Estilo de vida | ifood, 99food, burger, mc donalds, pizza, lanchonete, bar, restaurante, açaí, sorvete |
| Assinaturas | Estilo de vida | netflix, spotify, prime, apple.com, google, chatgpt, openai, claude, disney, max |
| Compras | Estilo de vida | americanas, amazon, shopee, mercado livre, shein, magalu, shopping |
| Cuidados pessoais | Estilo de vida | barbearia, salão, estética |
| Pix/pessoas | Revisar | nomes de pessoa física (2+ palavras sem termo comercial) |
| Taxas | Revisar | IOF, anuidade, juros, multa, encargos |

**Detecção de recorrentes**: mesmo estabelecimento (nome normalizado) em pelo menos 2 faturas, com valor dentro de ±10% e dia dentro de ±3 dias. Marca como assinatura, soma o custo anual e destaca: cobrança duplicada (2 do mesmo serviço no mês), cobrança em dólar (+IOF de 3,5%), aumento de preço e nome genérico ("Assinatura", "Google") que o usuário deve identificar.

**Parcelas**: linhas com "parcela x/y" viram compromisso futuro, somado nos próximos meses até terminar.

**Cartão ≠ mês**: a fatura cobre do fechamento anterior ao atual. Guardar data da compra e fatura de cobrança separadamente; os gráficos usam o mês da compra, o fluxo de caixa usa o mês do pagamento.

## Planos de metas: cálculos e priorização

As metas seguem uma escada fixa; o dinheiro vai para o degrau de baixo antes de subir, exceto metas com data marcada, que recebem sua parcela mínima desde já.

1. Fundo de 1 mês de custo de vida (colchão inicial).
2. Quitar dívidas com juros acima de 2% ao mês (rotativo, cheque especial, empréstimo pessoal).
3. Reserva completa (meses da tabela de diagnóstico).
4. Metas com data (viagem, compra, casamento), em paralelo, cada uma com seu aporte mínimo.
5. Investir para longo prazo (patrimônio, aposentadoria, juntar R$ 100 mil).

**Aporte mensal para uma meta** (r = rendimento mensal líquido, n = meses até a data, VA = valor que já tem):

```latex
PMT = \frac{(\text{Meta} - VA\,(1+r)^n)\; r}{(1+r)^n - 1}
```

Sem rendimento (metas até 12 meses, mais simples de mostrar): PMT = (Meta − VA) ÷ n. Usar r conservador: 0,8% ao mês para renda fixa pós-fixada líquida de IR, revisado quando a Selic mudar.

**Data provável no ritmo atual**: resolver a mesma equação para n com o aporte que o usuário já faz. Mostrar as duas datas: "no seu ritmo: jun/2027 · com os cortes sugeridos: abr/2027".

**Quando as metas não cabem** (soma dos aportes > sobra): o app oferece 3 saídas, nesta ordem: adiar a meta de menor prioridade; reduzir o valor (ex.: viagem econômica); liberar dinheiro com cortes específicos (lista da seção de dicas, com o valor de cada corte). Nunca sugere tirar da reserva para meta de desejo.

**Dívidas: avalanche x bola de neve**

| Método | Ordem | Quando recomendar |
| --- | --- | --- |
| Avalanche | Maior juros primeiro | Padrão: paga menos juros no total |
| Bola de neve | Menor saldo primeiro | Quando há 3+ dívidas pequenas e a pessoa precisa de vitórias rápidas para não desistir |

O app simula os dois mês a mês e mostra a diferença em reais e em meses. Gera também um texto de renegociação: quanto pode pagar por mês, pedido de desconto à vista e de troca de rotativo por parcelamento com juros menores.

**Exemplos de metas**

| Meta | Como o motor trata |
| --- | --- |
| Viagem em outubro/2027, R$ 6.000 | Meta com data: 11 meses → \~R$ 545/mês sem rendimento; guardar em CDB com liquidez ou Tesouro Selic; se for internacional, sugere comprar moeda aos poucos |
| Juntar R$ 100 mil | Longo prazo: mostra quanto por mês para 3, 5 e 8 anos; só começa após a reserva |
| Começar a investir | Libera quando a reserva está completa; separa o dinheiro por prazo (até 2 anos: pós-fixado com liquidez; 2–5 anos: prefixado ou IPCA+; acima de 5 anos: IPCA+ longo e, para perfil moderado/arrojado, uma parcela em fundos de índice) |

## Dicas úteis por situação

Cada dica tem gatilho (quando aparece) e valor estimado de economia, para o usuário ver o impacto em reais e na data da meta.

| Gatilho | Dica | Economia típica |
| --- | --- | --- |
| Comida fora > 15% da renda ou > 12 pedidos/mês | Teto semanal (não mensal) e 1 "dia de delivery" fixo; deixar 2 refeições rápidas prontas em casa | 30–50% da categoria |
| Muitas compras < R$ 30 | Regra das 24 h para compras não planejadas; app avisa quando passar de 10 no mês | R$ 100–300/mês |
| 2 ou mais serviços parecidos (IA, streaming, nuvem) | Manter os que usa toda semana; alternar streaming por mês em vez de assinar todos | R$ 30–150/mês |
| Assinatura em dólar | Checar plano em reais, plano anual (2 meses grátis em muitos serviços) ou alternativa nacional; IOF de 3,5% em toda compra internacional | 10–20% do valor |
| Assinatura duplicada ou sem nome claro | Abrir a lista de assinaturas do celular (iPhone: Ajustes → nome → Assinaturas; Android: Play Store → Pagamentos e assinaturas) | Valor da duplicada |
| Muitos abastecimentos de R$ 50 | Encher o tanque em posto de app com cashback; calibrar pneus | 5–10% do combustível |
| Gastos de casal pesando | Combinar um orçamento de saídas do mês e uma regra de divisão (meio a meio, proporcional à renda ou revezar) | Variável |
| Renda extra entrando | Regra fixa antes de gastar: 50% metas, 30% livre, 20% reinvestir no trabalho | Acelera metas |
| Dinheiro parado na conta corrente ou poupança | Mover a reserva para Tesouro Selic ou CDB com liquidez diária de 100% do CDI ou mais | Rendimento maior que a poupança |
| Fatura crescendo 3 meses seguidos | Mostrar o gráfico e propor o teto do próximo mês = média dos 3 últimos − 10% | Interrompe a escalada |
| Dívida no rotativo | Trocar por parcelamento ou empréstimo com juros menores imediatamente; nunca pagar só o mínimo | Juros evitados |
| Gastos anuais chegando (IPVA, material, Natal) | Separar 1/12 do valor por mês em uma "caixinha" desde janeiro | Evita o mês que estoura |

Tom das dicas: diretas, com número e sem culpa. Ex.: "Delivery levou R$ 840 em novembro. Com o teto de R$ 400, sua viagem chega 2 meses antes."

## Hábitos, avisos e retenção

O app se mantém vivo com 3 rituais curtos e poucos avisos, sempre com um número e uma ação.

**Rituais**

| Ritual | Quando | Duração | O que a pessoa faz |
| --- | --- | --- | --- |
| Lançamento rápido | Na hora do gasto (widget/atalho na tela inicial) | 5 s | Valor + categoria em 2 toques |
| Check-in semanal | Domingo à noite (horário escolhível) | 1 min | Vê "quanto ainda pode gastar até domingo" por categoria e confirma lançamentos |
| Fechamento mensal | 1 dia após o fechamento da fatura | 3 min | Importa a fatura, revisa "Revisar", vê o placar do mês e o novo plano |
| Dia do pagamento | Data em que a renda cai | 10 s | Confirma "já separei R$ X para as metas" |

**Avisos (no máximo 3 por semana)**

| Aviso | Gatilho | Exemplo |
| --- | --- | --- |
| Teto em 80% | Categoria chega a 80% do teto antes do dia 20 | "Comida fora: R$ 320 de R$ 400. Faltam 12 dias." |
| Teto estourado | Passou de 100% | "Passou R$ 56 em compras. Ajustar de outra categoria?" |
| Ritmo diário | Gasto do mês acima da linha ideal | "Para fechar no plano: até R$ 25/dia nesta semana." |
| Assinatura chegando | 2 dias antes da cobrança prevista | "Amanhã: Prime R$ 34,90. Ainda usa?" |
| Gasto anual chegando | 30 dias antes | "IPVA em janeiro: R$ 1.200. Caixinha tem R$ 800." |
| Meta perto | 90% da meta ou marco (25%, 50%, 75%) | "Reserva em 75%. Faltam R$ 3.300." |
| Sumiu | 7 dias sem abrir | "Sua semana em 1 minuto: você está R$ 80 abaixo do teto." |

**Mecânicas de hábito**

- Sequência de semanas dentro do plano (não de dias: semanas toleram deslizes).
- Placar mensal simples: quantas categorias ficaram no teto (ex.: 5 de 7).
- Barra de cada meta sempre visível na home, com a data prevista que se move a cada mês.
- "Dinheiro salvo": soma do que ficou abaixo do teto, vira aporte extra com 1 toque.
- Revisão de assinaturas a cada 3 meses, com lista e custo anual.
- Recomeço sem culpa: mês estourado não zera nada; o app mostra o impacto na data e propõe o próximo mês.

**Home minimalista (3 blocos)**: quanto ainda pode gastar este mês (e por dia); metas com barra e data; botão de lançar gasto.

## Limites e cuidados

O app orienta e calcula; não recomenda produtos específicos nem substitui um planejador certificado.

- Mostrar sempre: "Este plano é educativo e não é recomendação de investimento". Falar de tipos de produto (Tesouro Selic, CDB com liquidez, IPCA+, fundos de índice), nunca de um banco ou ativo específico como "o melhor".
- Taxas e rendimentos (Selic, CDI, IOF, IR) mudam: guardar em uma tabela de parâmetros atualizável, nunca fixos no código.
- Dados financeiros são sensíveis: armazenar no aparelho ou criptografados; nunca pedir senha de banco nem número completo de cartão; a fatura importada pode ser apagada após categorizar.
- Sem tempo real: deixar claro que os números valem até a última importação ou lançamento ("atualizado em 15/11").
- Sinais de aperto grave (atraso de contas básicas, dívidas maiores que 6 meses de renda): sugerir renegociação pelo Serasa Limpa Nome, pelo Desenrola ou pelo próprio credor, e orientação gratuita em Procon ou núcleos de educação financeira.

Perguntas em aberto para o chat do app: formato de importação suportado primeiro (PDF de qual banco, CSV, colar texto); onde os dados ficam (local ou nuvem); se haverá conta compartilhada para casal.
