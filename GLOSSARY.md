# Capi: finanças de bolso

Assistente pessoal de finanças, individual e genérico. A pessoa responde um onboarding e recebe um Plano mensal, que acompanha com Lançamentos e Importações de Fatura.

## Pessoa e plano

**Capi**:
O nome do app e da mascote, uma capivara que fala com o Usuário em primeira pessoa e com calma.
_Evitar_: mascote, bichinho, assistente (como nome)

**Capi do dia**:
A figurinha da Capi com uma frase na tela inicial, escolhida pela situação do Usuário naquele dia.
_Evitar_: banner, sticker

**Usuário**:
Uma única pessoa dona dos seus dados. Não existe conta compartilhada.
_Evitar_: conta, perfil, cliente

**Onboarding**:
O conjunto de respostas iniciais (renda, fixos, dívidas, reserva, objetivos) que alimenta o primeiro Plano.
_Evitar_: cadastro, questionário

**Plano**:
O conjunto de Tetos, Aporte mensal e Metas ordenadas, válido para um Mês do plano.
_Evitar_: orçamento, budget

**Diagnóstico**:
A fotografia da saúde financeira: Sobra, taxa de poupança, divisão 50-30-20, meses de fôlego e Status.
_Evitar_: análise, relatório

**Status**:
O semáforo do Diagnóstico: vermelho, amarelo, verde ou azul.
_Evitar_: nível, score

**Sobra**:
A renda menos fixos, variáveis, parcelas e 1/12 dos anuais, num mês.
_Evitar_: saldo, lucro

## Dinheiro que sai

**Lançamento**:
Um gasto registrado à mão, pelo Atalho do Apple Pay ou vindo de uma Importação, com valor, Categoria e data da compra.
_Evitar_: transação, despesa, gasto (como termo técnico)

**Categoria**:
A classe de um Lançamento, que pertence a um Grupo. Existem 17 padrão (Mercado, Delivery, Comida fora, Transporte por app, Combustível, Transporte, Compras online, Compras, Lazer, Assinaturas, Saúde, Treino, Educação, Casa e contas, Cuidados pessoais, Pix para pessoas, Outros), que podem ser escondidas mas não apagadas, e as que o Usuário cria.
_Evitar_: tag, etiqueta

**Loja**:
O estabelecimento de um Lançamento (iFood, Uber). Nunca é uma Categoria.
_Evitar_: merchant, comerciante

**Código do aparelho**:
O segredo aleatório criado no Capi instalado para autorizar as chamadas à ponte do Atalho do Apple Pay. Só o aparelho guarda o código. A ponte identifica a inscrição de push pelo hash SHA-256.

**Pendente**:
Um pagamento que a ponte do Atalho do Apple Pay guarda por até 48 horas, até o Capi confirmar a gravação no aparelho. No Capi, fica na fila até o Usuário confirmar a Categoria e salvar o Lançamento ou tocar em Descartar.

**Grupo**:
Um dos três baldes da regra 50-30-20: Essencial, Estilo de vida, Guardar/quitar.
_Evitar_: tipo, macro-categoria

**Teto**:
O limite de gasto de uma Categoria num Mês do plano.
_Evitar_: limite, orçamento da categoria

**Fixo**:
Um gasto mensal previsível, com nome, valor, dia, Categoria e forma de pagamento (no cartão ou fora). Entra sozinho em todo Mês do plano.
_Evitar_: conta fixa, despesa fixa

**Anual**:
Um gasto que ocorre uma vez por ano (IPVA, Natal); vira 1/12 por mês numa Caixinha.
_Evitar_: sazonal, eventual

**Caixinha**:
A reserva separada mês a mês para pagar um Anual.
_Evitar_: envelope, pote

## Cartão

**Fatura**:
O extrato de um ciclo do cartão, entre dois fechamentos, com data de vencimento.
_Evitar_: extrato, conta do cartão

**Importação**:
O ato de trazer uma Fatura (CSV, OFX, PDF ou texto) e transformá-la em Lançamentos.
_Evitar_: upload, sincronização

**Previsão de fatura**:
O valor esperado da próxima Fatura: Lançamentos do ciclo atual, mais Parcelas e Recorrentes e Fixos no cartão que ainda vão cair, separado por Categoria.
_Evitar_: fatura parcial, projeção

**Recorrente**:
Um estabelecimento que reaparece em 2+ Faturas com valor e dia parecidos; normalmente uma assinatura.
_Evitar_: assinatura (como termo técnico), repetido

**Conciliação**:
A junção de um Lançamento manual ou do Atalho com a linha correspondente da Fatura (mesmo valor, até 3 dias de diferença, nome parecido). A Fatura prevalece e a Categoria escolhida é mantida.
_Evitar_: deduplicação, merge

**Parcela**:
Uma fração "x/y" de uma compra parcelada; gera compromisso nos meses seguintes.
_Evitar_: prestação

**Regra de estabelecimento**:
A Categoria que o Usuário escolheu uma vez para um estabelecimento e que passa a valer sempre.
_Evitar_: mapeamento, filtro

## Metas

**Meta**:
Um objetivo com valor-alvo, valor atual, data-alvo opcional e prioridade.
_Evitar_: objetivo (no código), sonho

**Degrau**:
A posição de uma Meta na escada de prioridade fixa (colchão, dívida cara, reserva, metas com data, longo prazo).
_Evitar_: nível, etapa

**Aporte**:
O valor mensal destinado a uma Meta.
_Evitar_: depósito, contribuição

**Reserva**:
A Meta de emergência, calculada em meses de custo de vida.
_Evitar_: fundo de emergência, poupança

**Dívida**:
Um saldo devedor com juros mensais, parcela e situação de atraso.
_Evitar_: empréstimo, débito

## Tempo e rotina

**Mês do plano**:
O período ao qual Tetos e Placar se referem; usa a data da compra, não a da Fatura.
_Evitar_: competência, ciclo

**Fechamento mensal**:
O ritual em que o Usuário importa a Fatura, revisa e recebe o Plano reajustado.
_Evitar_: virada do mês

**Check-in**:
O ritual semanal de 1 minuto para ver quanto ainda pode gastar.
_Evitar_: revisão semanal

**Aviso**:
Uma mensagem proativa com número e ação; no máximo 3 por semana.
_Evitar_: notificação (como termo de domínio), alerta

**Parâmetro**:
Um valor de mercado atualizável (Selic, CDI, IOF, IR, salário mínimo) usado nos cálculos.
_Evitar_: constante, configuração
