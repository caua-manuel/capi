#!/usr/bin/env bash
# Publica a spec e as 21 issues do MVP no GitHub Issues deste repositório.
# Rode UMA vez, dentro da pasta do projeto, depois de: git remote add origin <url> e gh auth login
set -euo pipefail

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
echo "Vou publicar no repositório: $REPO"
read -r -p "É o seu repositório? (s/n) " ok; [ "$ok" = "s" ] || exit 1

for l in needs-triage needs-info ready-for-agent ready-for-human wontfix em-andamento modelo:sonnet modelo:opus; do gh label create "$l" --force >/dev/null; done

SPEC=$(gh issue create --title "Especificação: MVP do Capi" --label ready-for-agent --body-file .scratch/mvp/spec.md | grep -o "[0-9]*$")
echo "Spec: #$SPEC"
declare -A N

liga_bloqueio() { # $1 = issue filha, $2 = issue que bloqueia
  local id; id=$(gh api "repos/$REPO/issues/$2" --jq .id)
  gh api --method POST "repos/$REPO/issues/$1/dependencies/blocked_by" -F issue_id="$id" >/dev/null 2>&1 || true
}

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

Um app vazio, mas real: abre no iPhone, pode ser adicionado à tela de início, funciona offline e é publicado no GitHub Pages a cada push. Já tem testes rodando e um Repositório mínimo gravando no IndexedDB.

## Critérios de aceite

- [ ] Abre pelo endereço do GitHub Pages e pode ser adicionado à tela de início do iPhone com ícone e nome
- [ ] Abre sem internet depois da primeira visita
- [ ] \`npm run test\` roda o Vitest com um teste de exemplo passando
- [ ] O Repositório grava e lê um registro de teste no IndexedDB
- [ ] Pastas separadas para Motor, Leitor, Importador, Conciliação, Repositório e Telas, como manda a spec

## Bloqueado por

Nenhum (pode começar já)
FIM
)
N[1]=$(gh issue create --title "01: Esqueleto do PWA instalável" --label ready-for-agent --label modelo:sonnet --body "$BODY" | grep -o "[0-9]*$")
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[1]} --jq .id)" >/dev/null 2>&1 || true
echo "01 -> #${N[1]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

O Usuário toca no botão de lançar, escreve "ifood 42" ou "pix joão 50" (ou dita pelo teclado), confere a Categoria sugerida e salva. O Lançamento aparece na lista do mês na home.

## Critérios de aceite

- [ ] O Leitor de lançamento entende valor com vírgula ou ponto, Loja e Categoria sugerida (testes com /tdd)
- [ ] As 17 Categorias padrão existem com seu Grupo e palavras-chave
- [ ] A Categoria escolhida para uma Loja vira Regra de estabelecimento e é sugerida da próxima vez
- [ ] Lançamentos podem ser editados e apagados
- [ ] O botão de lançar fica sempre visível na home

## Bloqueado por

- #${N[1]} (01)
FIM
)
N[2]=$(gh issue create --title "02: Lançamento rápido escrito" --label ready-for-agent --label modelo:sonnet --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[2]}" "${N[1]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[2]} --jq .id)" >/dev/null 2>&1 || true
echo "02 -> #${N[2]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

Pagar por aproximação (crédito ou débito) dispara uma automação do Atalhos que abre o app com valor e Loja preenchidos; o Usuário só confirma a Categoria.

## Critérios de aceite

- [ ] A rota de lançamento aceita \`valor\`, \`loja\` e \`origem\` e abre o lançamento preenchido (ADR 0003)
- [ ] Valores e nomes com acento ou espaço chegam corretos
- [ ] O Lançamento guarda a origem \`applepay\`
- [ ] Existe uma tela com o passo a passo, com prints, para criar a automação de Transação no app Atalhos

## Bloqueado por

- #${N[2]} (02)
FIM
)
N[3]=$(gh issue create --title "03: Lançamento pelo Atalho do Apple Pay" --label ready-for-agent --label modelo:sonnet --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[3]}" "${N[2]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[3]} --jq .id)" >/dev/null 2>&1 || true
echo "03 -> #${N[3]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

O Usuário cria Categorias (Pet, Moto) escolhendo o Grupo, em Ajustes ou direto no Novo gasto, e esconde Categorias padrão que não usa.

## Critérios de aceite

- [ ] Criar, renomear e apagar Categorias próprias, com escolha de Grupo
- [ ] Categorias padrão podem ser escondidas mas não apagadas
- [ ] Uma Categoria escondida não aparece no lançamento, mas seus Lançamentos antigos continuam contando
- [ ] No Novo gasto, um chip \"+ Nova categoria\" cria a categoria ali mesmo (nome + Grupo) e já a seleciona, sem sair do lançamento

## Bloqueado por

- #${N[2]} (02)
FIM
)
N[4]=$(gh issue create --title "04: Categorias próprias e esconder padrão" --label ready-for-agent --label modelo:sonnet --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[4]}" "${N[2]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[4]} --jq .id)" >/dev/null 2>&1 || true
echo "04 -> #${N[4]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

O Usuário novo responde as perguntas obrigatórias, uma por tela e com "não sei / estimar", e no final vê o Diagnóstico: Sobra, taxa de poupança, divisão 50-30-20, meses de fôlego, Status com mensagem e sinais de alerta.

## Critérios de aceite

- [ ] Perguntas 1, 2, 3, 5, 6, 9, 10 e 13 do motor-financeiro, uma por tela, com chips e barra de progresso
- [ ] O Motor calcula as fórmulas e o Status exatamente como no motor-financeiro (testes com /tdd e pessoas fictícias)
- [ ] Renda variável usa a média dos 3 piores meses
- [ ] Os ajustes 40-20-40 e 60-30-10 são aplicados nos casos descritos
- [ ] As respostas podem ser editadas depois em Ajustes

## Bloqueado por

- #${N[1]} (01)
FIM
)
N[5]=$(gh issue create --title "05: Onboarding com as perguntas obrigatórias e Diagnóstico" --label ready-for-agent --label modelo:opus --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[5]}" "${N[1]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[5]} --jq .id)" >/dev/null 2>&1 || true
echo "05 -> #${N[5]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

O Usuário cadastra Fixos (mensalidade do treino, celular, faculdade) com nome, valor, dia, Categoria e forma de pagamento; eles entram sozinhos em todo Mês do plano.

## Critérios de aceite

- [ ] Os Fixos declarados no onboarding já aparecem cadastrados
- [ ] Cada Fixo entra no Mês do plano no dia certo
- [ ] Um Fixo fora do cartão conta no mês mas não na Previsão de fatura
- [ ] Editar um Fixo vale a partir do mês atual, sem mudar meses fechados

## Bloqueado por

- #${N[5]} (05)
FIM
)
N[6]=$(gh issue create --title "06: Cadastro de Fixos" --label ready-for-agent --label modelo:sonnet --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[6]}" "${N[5]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[6]} --jq .id)" >/dev/null 2>&1 || true
echo "06 -> #${N[6]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

O Motor gera os Tetos por Categoria do Mês do plano e a home mostra quanto ainda pode gastar no mês e por dia, as Metas e o botão de lançar.

## Critérios de aceite

- [ ] O Motor gera os Tetos a partir da renda, dos Fixos e do Grupo de cada Categoria (testes com /tdd)
- [ ] A home mostra quanto ainda pode gastar no mês e por dia, considerando Lançamentos e Fixos
- [ ] Os Tetos usam a data da compra
- [ ] A home mostra a data da última atualização e o aviso de plano educativo

## Bloqueado por

- #${N[2]} (02)
- #${N[5]} (05)
- #${N[6]} (06)
FIM
)
N[7]=$(gh issue create --title "07: Plano com Tetos e home de 3 blocos" --label ready-for-agent --label modelo:opus --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[7]}" "${N[2]}"
liga_bloqueio "${N[7]}" "${N[5]}"
liga_bloqueio "${N[7]}" "${N[6]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[7]} --jq .id)" >/dev/null 2>&1 || true
echo "07 -> #${N[7]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

O Usuário escolhe objetivos, responde as perguntas de cada um e vê as Metas ordenadas pelos Degraus, com Aporte mensal, data "no seu ritmo" e "com os cortes sugeridos", e barra de progresso na home.

## Critérios de aceite

- [ ] Perguntas extras de cada objetivo do motor-financeiro
- [ ] Escada de Degraus e fórmula do Aporte, com e sem rendimento, como no motor-financeiro (testes com /tdd)
- [ ] Quando as Metas não cabem na Sobra, aparecem as 3 saídas e nunca a sugestão de tirar da Reserva
- [ ] Barra, valor atual e data prevista de cada Meta na home

## Bloqueado por

- #${N[5]} (05)
FIM
)
N[8]=$(gh issue create --title "08: Metas com escada, Aporte e duas datas" --label ready-for-agent --label modelo:opus --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[8]}" "${N[5]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[8]} --jq .id)" >/dev/null 2>&1 || true
echo "08 -> #${N[8]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

O Usuário com Dívidas vê os dois métodos simulados mês a mês, com a diferença em reais e meses, e recebe um texto de renegociação pronto.

## Critérios de aceite

- [ ] Simulação mês a mês dos dois métodos (testes com /tdd)
- [ ] Recomendação padrão avalanche, ou bola de neve com 3+ dívidas pequenas
- [ ] Texto de renegociação com quanto pode pagar por mês
- [ ] Aperto grave mostra Serasa Limpa Nome, Desenrola, credor e Procon

## Bloqueado por

- #${N[8]} (08)
FIM
)
N[9]=$(gh issue create --title "09: Dívidas: avalanche x bola de neve" --label ready-for-agent --label modelo:opus --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[9]}" "${N[8]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[9]} --jq .id)" >/dev/null 2>&1 || true
echo "09 -> #${N[9]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

No Fechamento mensal o Usuário cola o texto da Fatura do PicPay e todos os gastos viram Lançamentos; o que não for categorizado vai para "Revisar".

Aguardando o texto real da fatura de novembro (fecha em 5/12).

## Critérios de aceite

- [ ] O Importador lê data, Loja, valor, Parcela x/y, IOF e estorno do texto real do PicPay (testes com /tdd usando a fatura real sem dados sensíveis)
- [ ] Ignora pagamento de fatura e estornos, e separa o IOF
- [ ] Parcelas viram compromissos dos meses seguintes
- [ ] Linhas sem Categoria vão para "Revisar" e a escolha vira Regra de estabelecimento
- [ ] O texto colado é descartado depois da Importação

## Bloqueado por

- #${N[2]} (02)
FIM
)
N[10]=$(gh issue create --title "10: Importação colando o texto da Fatura do PicPay" --label needs-info --label modelo:opus --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[10]}" "${N[2]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[10]} --jq .id)" >/dev/null 2>&1 || true
echo "10 -> #${N[10]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

Ao importar, cada linha da Fatura que já existe como Lançamento manual, do Atalho ou como Fixo no cartão é juntada em vez de duplicada.

## Critérios de aceite

- [ ] Junta por mesmo valor, data até ±3 dias e nome parecido (testes com /tdd)
- [ ] A Fatura prevalece em data e valor; a Categoria do Usuário é mantida
- [ ] Lançamentos sem par na Fatura e linhas duvidosas aparecem em "Revisar"
- [ ] Importar a mesma Fatura duas vezes não duplica nada

## Bloqueado por

- #${N[6]} (06)
- #${N[10]} (10)
FIM
)
N[11]=$(gh issue create --title "11: Conciliação entre Fatura, Lançamentos e Fixos" --label ready-for-agent --label modelo:opus --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[11]}" "${N[6]}"
liga_bloqueio "${N[11]}" "${N[10]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[11]} --jq .id)" >/dev/null 2>&1 || true
echo "11 -> #${N[11]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

O app detecta assinaturas e cobranças repetidas entre Faturas e destaca duplicidade, cobrança em dólar, aumento de preço e nome genérico.

## Critérios de aceite

- [ ] Mesma Loja normalizada em 2+ Faturas, valor ±10% e dia ±3 (testes com /tdd)
- [ ] Mostra o custo anual de cada Recorrente
- [ ] Destaca duplicada, cobrança em dólar (+IOF), aumento de preço e nome genérico

## Bloqueado por

- #${N[10]} (10)
FIM
)
N[12]=$(gh issue create --title "12: Detecção de Recorrentes" --label ready-for-agent --label modelo:opus --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[12]}" "${N[10]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[12]} --jq .id)" >/dev/null 2>&1 || true
echo "12 -> #${N[12]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

Depois de importar, o Usuário vê o placar do mês, o Plano reajustado e o lembrete de backup. A primeira Fatura vira o Mês do plano 0, sem Tetos, e gera os Tetos seguintes.

## Critérios de aceite

- [ ] Placar com quantas Categorias ficaram no Teto
- [ ] O Plano do mês seguinte é recalculado com o que aconteceu
- [ ] A primeira Fatura importada conta como Mês do plano 0, sem Tetos
- [ ] Mês estourado não apaga nada e mostra o impacto na data das Metas
- [ ] Lembra de exportar o backup

## Bloqueado por

- #${N[7]} (07)
- #${N[11]} (11)
FIM
)
N[13]=$(gh issue create --title "13: Fechamento mensal" --label ready-for-agent --label modelo:sonnet --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[13]}" "${N[7]}"
liga_bloqueio "${N[13]}" "${N[11]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[13]} --jq .id)" >/dev/null 2>&1 || true
echo "13 -> #${N[13]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

A home mostra a Previsão da próxima Fatura e os dias até o fechamento; tocando, ela abre por Categoria com as Lojas que mais pesaram.

## Critérios de aceite

- [ ] Soma Lançamentos do ciclo atual, Parcelas, Recorrentes e Fixos no cartão que ainda vão cair (testes com /tdd)
- [ ] Separa por Categoria e mostra as Lojas que mais pesaram em cada uma
- [ ] Respeita a data de fechamento do cartão do Usuário

## Bloqueado por

- #${N[7]} (07)
- #${N[10]} (10)
- #${N[12]} (12)
FIM
)
N[14]=$(gh issue create --title "14: Previsão de fatura por Categoria" --label ready-for-agent --label modelo:opus --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[14]}" "${N[7]}"
liga_bloqueio "${N[14]}" "${N[10]}"
liga_bloqueio "${N[14]}" "${N[12]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[14]} --jq .id)" >/dev/null 2>&1 || true
echo "14 -> #${N[14]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

Uma linha do tempo dos próximos 3 meses com Fixos, Parcelas, Recorrentes, Anuais com Caixinha e dia do pagamento, mostrando qual mês vai apertar.

## Critérios de aceite

- [ ] Lista os compromissos dos próximos 3 meses por data
- [ ] Mostra o total por mês e destaca o mês mais apertado
- [ ] Anuais aparecem com o valor da Caixinha e quanto falta

## Bloqueado por

- #${N[6]} (06)
- #${N[10]} (10)
- #${N[12]} (12)
FIM
)
N[15]=$(gh issue create --title "15: Calendário de compromissos" --label ready-for-agent --label modelo:sonnet --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[15]}" "${N[6]}"
liga_bloqueio "${N[15]}" "${N[10]}"
liga_bloqueio "${N[15]}" "${N[12]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[15]} --jq .id)" >/dev/null 2>&1 || true
echo "15 -> #${N[15]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

O Usuário digita preço e parcelamento e vê na hora o impacto no Teto da Categoria, na Previsão de fatura e na data das Metas, com a opção da regra das 24 h.

## Critérios de aceite

- [ ] Resposta do Motor para compra à vista e parcelada (testes com /tdd)
- [ ] Mostra se cabe no Teto, quanto muda a Previsão de fatura e quanto atrasa cada Meta
- [ ] A regra das 24 h guarda a compra e lembra o Usuário na próxima abertura depois de 24 h

## Bloqueado por

- #${N[7]} (07)
- #${N[8]} (08)
- #${N[14]} (14)
FIM
)
N[16]=$(gh issue create --title "16: \"Posso comprar?\"" --label ready-for-agent --label modelo:opus --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[16]}" "${N[7]}"
liga_bloqueio "${N[16]}" "${N[8]}"
liga_bloqueio "${N[16]}" "${N[14]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[16]} --jq .id)" >/dev/null 2>&1 || true
echo "16 -> #${N[16]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

Ao abrir o app aparecem os Avisos do momento (no máximo 3 por semana) e as dicas com o valor da economia e o efeito na data da Meta.

## Critérios de aceite

- [ ] Avisos da tabela do motor-financeiro, escolhidos por prioridade, com limite de 3 por semana (testes com /tdd)
- [ ] Dicas com gatilho e economia estimada em reais e na data da Meta
- [ ] Tom direto, com número e sem culpa

## Bloqueado por

- #${N[7]} (07)
- #${N[8]} (08)
- #${N[12]} (12)
FIM
)
N[17]=$(gh issue create --title "17: Avisos dentro do app e dicas" --label ready-for-agent --label modelo:opus --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[17]}" "${N[7]}"
liga_bloqueio "${N[17]}" "${N[8]}"
liga_bloqueio "${N[17]}" "${N[12]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[17]} --jq .id)" >/dev/null 2>&1 || true
echo "17 -> #${N[17]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

Check-in semanal, Dia do pagamento, sequência de semanas e "dinheiro salvo", com rotas próprias e um guia para criar os Lembretes de horário no app Atalhos.

## Critérios de aceite

- [ ] Rotas que abrem direto o Check-in, o Dia do pagamento e o Fechamento mensal
- [ ] Check-in mostra quanto ainda pode gastar até domingo por Categoria
- [ ] Sequência de semanas dentro do Plano
- [ ] "Dinheiro salvo" vira Aporte extra com 1 toque
- [ ] Guia com prints para criar as 3 automações de horário

## Bloqueado por

- #${N[7]} (07)
- #${N[8]} (08)
FIM
)
N[18]=$(gh issue create --title "18: Rituais e Lembretes pelo Atalhos" --label ready-for-agent --label modelo:sonnet --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[18]}" "${N[7]}"
liga_bloqueio "${N[18]}" "${N[8]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[18]} --jq .id)" >/dev/null 2>&1 || true
echo "18 -> #${N[18]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

Um toque esconde todos os valores do app (R$ ••••) até tocar de novo.

## Critérios de aceite

- [ ] Todos os valores em todas as telas ficam escondidos
- [ ] A escolha fica salva entre aberturas

## Bloqueado por

- #${N[2]} (02)
FIM
)
N[19]=$(gh issue create --title "19: Modo discreto" --label ready-for-agent --label modelo:sonnet --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[19]}" "${N[2]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[19]} --jq .id)" >/dev/null 2>&1 || true
echo "19 -> #${N[19]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

O Usuário exporta um arquivo com todos os dados, pode protegê-lo com senha e restaura em outro aparelho.

## Critérios de aceite

- [ ] Exportar gera um arquivo com todas as entidades
- [ ] Com senha, o arquivo fica criptografado e só abre com a mesma senha
- [ ] Restaurar substitui os dados atuais após confirmação
- [ ] Senha errada mostra erro claro e não apaga nada

## Bloqueado por

- #${N[6]} (06)
- #${N[8]} (08)
FIM
)
N[20]=$(gh issue create --title "20: Backup com senha opcional" --label ready-for-agent --label modelo:sonnet --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[20]}" "${N[6]}"
liga_bloqueio "${N[20]}" "${N[8]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[20]} --jq .id)" >/dev/null 2>&1 || true
echo "20 -> #${N[20]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

Selic, CDI, IOF, IR e salário mínimo ficam numa tabela com data de atualização, que o Usuário pode editar em Ajustes.

## Critérios de aceite

- [ ] Nenhum Parâmetro é escrito direto nas fórmulas do Motor
- [ ] Ajustes mostra cada Parâmetro com a data da última atualização
- [ ] Mudar um Parâmetro recalcula Plano e datas das Metas

## Bloqueado por

- #${N[5]} (05)
FIM
)
N[21]=$(gh issue create --title "21: Tabela de Parâmetros em Ajustes" --label ready-for-agent --label modelo:sonnet --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[21]}" "${N[5]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[21]} --jq .id)" >/dev/null 2>&1 || true
echo "21 -> #${N[21]}"

BODY=$(cat <<FIM
Parte de #$SPEC

## O que construir

A mascote Capi aparece nos momentos de relação (boas-vindas, onboarding, diagnóstico, lançamento salvo, metas, check-in, fechamento, placar e ajustes), seguindo as regras do DESIGN.md. Na tela inicial, a Capi do dia mostra uma figurinha e uma frase escolhidas pela situação do Usuário.

## Critérios de aceite

- [ ] As poses de \`design/capi/\` são servidas pelo app e aparecem só nas telas indicadas no DESIGN.md, nunca duas na mesma tela
- [ ] O Motor escolhe a Capi do dia pela situação (Aviso ativo, Meta que andou, dia de Check-in, Anual chegando) e só sorteia quando não há nada a dizer (testes com /tdd)
- [ ] Tocar na Capi do dia leva para a tela ligada à frase
- [ ] A Capi do dia muda no máximo uma vez por dia
- [ ] As imagens respeitam o modo discreto e o tema escuro, sem trocar as cores da mascote

## Bloqueado por

- #${N[7]} (07)
- #${N[17]} (17)
FIM
)
N[22]=$(gh issue create --title "22: Capi nas telas e Capi do dia" --label ready-for-agent --label modelo:sonnet --body "$BODY" | grep -o "[0-9]*$")
liga_bloqueio "${N[22]}" "${N[7]}"
liga_bloqueio "${N[22]}" "${N[17]}"
gh api --method POST "repos/$REPO/issues/$SPEC/sub_issues" -F sub_issue_id="$(gh api repos/$REPO/issues/${N[22]} --jq .id)" >/dev/null 2>&1 || true
echo "22 -> #${N[22]}"
echo "Pronto. Confira em: https://github.com/$REPO/issues"
echo "Agora pode apagar a pasta .scratch/ (o GitHub passou a ser a fonte das issues)."
