# Especificação: MVP do app de finanças de bolso (até 15/12/2026)

Vocabulário: `GLOSSARY.md`. Regras e fórmulas financeiras: `docs/motor-financeiro.md`. Decisões de arquitetura: `docs/adr/`.

## Problema

A pessoa não sabe para onde vai o dinheiro. O cartão passa de R$ 2.000 sem ela perceber, as metas (viagem, juntar R$ 20 mil ou R$ 100 mil, começar a investir) não têm data nem valor mensal, e os apps de finanças ou pedem senha do banco ou dão tanto trabalho que são abandonados. Os gastos não chegam em tempo real e ninguém lembra de abrir o app.

## Solução

Um PWA instalado na tela de início do iPhone, sem login e sem servidor, com todos os dados no aparelho. O Onboarding gera um Diagnóstico e um Plano com Tetos por Categoria, Aporte mensal e Metas com data. Os gastos entram de três formas:
1. lançamento rápido escrito ("ifood 42");
2. Atalho do Apple Pay, que abre o app preenchido ao pagar por aproximação;
3. texto da Fatura colado no Fechamento mensal, que faz a Conciliação com o que já foi lançado.

A home mostra quanto ainda pode gastar, a Previsão de fatura por Categoria e as Metas. Lembretes de horário do app Atalhos trazem a pessoa de volta.

## Histórias de usuário

### Onboarding e Plano
1. Como Usuário novo, quero responder uma pergunta por tela, com chips de valores comuns, para terminar em poucos minutos.
2. Como Usuário, quero marcar "não sei / estimar" em qualquer pergunta, para não travar no onboarding.
3. Como Usuário, quero ver um número útil logo ao final do onboarding, para sentir que o app vale a pena no primeiro uso.
4. Como Usuário, quero escolher vários objetivos (viagem, juntar um valor, investir, quitar dívida, reserva…), para que o Plano cubra tudo o que eu quero.
5. Como Usuário, quero responder as perguntas extras de cada objetivo, para que cada Meta tenha valor e data reais.
6. Como Usuário com renda variável, quero que o Plano use a média dos meus 3 piores meses, para não planejar com dinheiro que talvez não venha.
7. Como Usuário, quero ver meu Status (semáforo) com uma mensagem principal, para saber qual é a prioridade agora.
8. Como Usuário, quero ver a Sobra, a taxa de poupança, a divisão 50-30-20 e os meses de fôlego, para entender minha situação em 4 números.
9. Como Usuário, quero ver os sinais de alerta do Diagnóstico, para saber onde o dinheiro vaza.
10. Como Usuário, quero receber Tetos por Categoria para o Mês do plano, para saber quanto posso gastar em cada coisa.
11. Como Usuário, quero ver minhas Metas ordenadas pelos Degraus, com Aporte e data prevista, para saber onde colocar cada real.
12. Como Usuário, quero ver duas datas por Meta ("no seu ritmo" e "com os cortes sugeridos"), para ver o efeito dos cortes.
13. Como Usuário cujas Metas não cabem na Sobra, quero receber as 3 saídas (adiar, reduzir, cortar com valores), para decidir sem tirar dinheiro da Reserva.
14. Como Usuário com Dívidas, quero comparar avalanche e bola de neve em reais e em meses, para escolher como quitar.
15. Como Usuário com Dívida cara, quero um texto de renegociação pronto, para negociar com o credor.
16. Como Usuário, quero editar as respostas do onboarding depois, para que o Plano acompanhe as mudanças na minha vida.

### Fixos e Categorias
17. Como Usuário, quero cadastrar Fixos com nome, valor, dia, Categoria e forma de pagamento, para que a mensalidade do treino e o celular entrem sozinhos todo mês.
18. Como Usuário, quero que um Fixo pago no cartão faça Conciliação com a linha da Fatura, para não contar duas vezes.
19. Como Usuário, quero usar as 17 Categorias padrão, para não precisar montar nada antes de começar.
20. Como Usuário, quero criar uma Categoria própria e escolher o Grupo dela, inclusive direto no Novo gasto, para que gastos como Pet ou Moto tenham lugar sem eu sair do lançamento.
21. Como Usuário, quero esconder Categorias padrão que não uso, para manter a lista curta.

### Lançamentos
22. Como Usuário, quero lançar um gasto escrevendo "ifood 42" ou "pix joão 50", para levar poucos segundos.
23. Como Usuário, quero ditar o lançamento pelo teclado do iPhone, para lançar sem digitar.
24. Como Usuário, quero que o app sugira a Categoria pela Loja, para só precisar confirmar.
25. Como Usuário, quero que a Categoria que escolho para uma Loja vire Regra de estabelecimento, para não escolher de novo.
26. Como Usuário de iPhone, quero que um pagamento por aproximação (crédito ou débito) abra o app com valor e Loja preenchidos, para o gasto entrar quase em tempo real.
27. Como Usuário, quero um passo a passo para configurar o Atalho do Apple Pay, para instalar sem saber programar.
28. Como Usuário, quero lançar Pix manualmente pelo lançamento rápido, para que gastos fora do cartão também contem.
29. Como Usuário, quero editar e apagar Lançamentos, para corrigir erros.

### Fatura e Fechamento mensal
30. Como Usuário, quero colar o texto da Fatura do PicPay, para que todos os gastos do ciclo entrem de uma vez.
31. Como Usuário, quero que a Importação ignore o pagamento da fatura e os estornos e separe o IOF, para que os totais fiquem certos.
32. Como Usuário, quero que os Lançamentos já feitos sejam conciliados com as linhas da Fatura (mesmo valor, até 3 dias de diferença, nome parecido), para nada ser contado duas vezes.
33. Como Usuário, quero revisar em "Revisar" o que não casou ou não foi categorizado, para resolver tudo numa tela só.
34. Como Usuário, quero que Parcelas "x/y" virem compromissos dos meses seguintes, para que a previsão já conte com elas.
35. Como Usuário, quero que os Recorrentes sejam detectados, com custo anual, duplicidade, cobrança em dólar e aumento de preço, para cortar assinaturas esquecidas.
36. Como Usuário, quero que os Tetos usem a data da compra e o fluxo de caixa use a data de pagamento, para que cartão e mês não se misturem.
37. Como Usuário, quero que o texto colado seja descartado depois da Importação, para que só fiquem os Lançamentos.
38. Como Usuário, quero ver o placar do mês (quantas Categorias ficaram no Teto) no Fechamento mensal, para sentir meu progresso.
39. Como Usuário, quero receber o Plano reajustado no Fechamento mensal, para que Tetos e datas reflitam o que aconteceu de verdade.
40. Como Usuário que começou no meio do ciclo, quero que a primeira Fatura conte como um Mês do plano normal, sem Tetos, e que os Tetos seguintes saiam dela, para que o Plano parta dos meus gastos reais.

### Home e consulta
41. Como Usuário, quero ver na home quanto ainda posso gastar no mês e por dia, para decidir na hora.
42. Como Usuário, quero ver a Previsão de fatura e os dias até o fechamento, para a fatura não me surpreender.
43. Como Usuário, quero abrir a Previsão de fatura por Categoria e ver as Lojas que mais pesaram, para saber exatamente o que cortar.
44. Como Usuário, quero ver a barra e a data prevista de cada Meta na home, para lembrar por que estou economizando.
45. Como Usuário, quero um botão de lançar sempre visível, para que lançar seja o caminho mais curto.
46. Como Usuário, quero ver os Avisos do momento ao abrir o app (no máximo 3 por semana), para receber o alerta certo sem excesso.
47. Como Usuário, quero ver a data da última atualização, para saber até quando os números valem.

### "Posso comprar?" e Calendário
48. Como Usuário, quero digitar preço e parcelamento em "Posso comprar?", para ver o impacto no Teto, na Previsão de fatura e na data das Metas antes de comprar.
49. Como Usuário com uma compra não planejada, quero acionar a regra das 24 h com lembrete, para evitar o impulso.
50. Como Usuário, quero ver os próximos 3 meses com Fixos, Parcelas, Recorrentes, Anuais e dia do pagamento, para saber qual mês vai apertar.
51. Como Usuário, quero ver os Anuais com a Caixinha de cada um, para que IPVA ou Natal não estourem o mês.

### Hábitos e Lembretes
52. Como Usuário, quero configurar Lembretes pelo Atalhos (domingo, dia do pagamento, dia seguinte ao fechamento), para voltar ao app sem precisar de servidor.
53. Como Usuário, quero que cada Lembrete abra o app na tela certa, para que o ritual leve 1 minuto.
54. Como Usuário, quero fazer o Check-in semanal e ver quanto ainda posso gastar até domingo, para corrigir o rumo cedo.
55. Como Usuário, quero confirmar no dia do pagamento quanto separei para as Metas, para que o Aporte vire hábito.
56. Como Usuário, quero manter uma sequência de semanas dentro do Plano, para que um deslize não zere meu esforço.
57. Como Usuário, quero que um mês estourado não apague nada e mostre só o impacto na data, para recomeçar sem culpa.
58. Como Usuário, quero transformar o "dinheiro salvo" abaixo do Teto em Aporte extra com 1 toque, para que a economia vire progresso.
59. Como Usuário, quero ver dicas com o valor da economia e o efeito na data da Meta, para que cada dica seja concreta.

### Privacidade e dados
60. Como Usuário, quero ativar o modo discreto com 1 toque, para abrir o app em público.
61. Como Usuário, quero exportar um arquivo de backup, com senha opcional, para não perder tudo ao trocar de celular.
62. Como Usuário, quero importar esse backup, para restaurar meus dados.
63. Como Usuário, quero ser lembrado de exportar no Fechamento mensal, para meu backup não ficar velho.
64. Como Usuário, quero que o app nunca peça senha de banco nem número completo de cartão, para poder confiar nele.
65. Como Usuário, quero ver sempre que o Plano é educativo e não é recomendação de investimento, para entender o limite do app.
66. Como Usuário em aperto grave, quero ser orientado para renegociação (Serasa Limpa Nome, Desenrola, credor) e orientação gratuita (Procon), para saber onde buscar ajuda.

## Decisões de implementação

- **Formato:** PWA estático em React + TypeScript + Vite, hospedado no GitHub Pages, sem servidor nem login (ADR 0002). Só Usuário individual (ADR 0001). Só Brasil: português e reais.
- **Armazenamento:** IndexedDB no aparelho. O backup é um arquivo JSON, que pode ser criptografado com uma senha do Usuário (Web Crypto, sem recuperação).
- **Módulos:**
  - **Motor** (puro, sem tela, sem ler nem gravar dados): recebe Onboarding, Fixos, Lançamentos, Metas, Dívidas e Parâmetros e devolve Diagnóstico, Plano, Previsão de fatura, Calendário, a resposta do "Posso comprar?", os Avisos que devem aparecer e as dicas. Toda regra do `motor-financeiro.md` fica aqui.
  - **Leitor de lançamento:** transforma texto livre ("ifood 42", "pix joão 50") em valor, Loja e Categoria sugerida. Puro.
  - **Importador de fatura:** transforma o texto colado do PicPay em linhas de Fatura (data, Loja, valor, Parcela x/y, IOF, estorno). Puro, um leitor por banco, começando pelo PicPay.
  - **Conciliação:** junta linhas de Fatura com Lançamentos e Fixos existentes. Puro.
  - **Repositório:** grava e lê as entidades no IndexedDB e faz backup e restauração. É a única parte que lê e grava dados.
  - **Telas:** só mostram o que o Motor devolve e chamam o Repositório.
- **Parâmetros:** Selic, CDI, IOF, IR e salário mínimo ficam numa tabela com data de atualização, editável em Ajustes, nunca espalhados pelo código.
- **Formato da URL de entrada (ADR 0003):** a rota de lançamento aceita `valor`, `loja` e `origem` (`applepay` ou `manual`) e abre o lançamento preenchido para confirmar. Outras rotas abrem direto o Check-in, o Fechamento mensal e o Dia do pagamento, para os Lembretes.
- **Regras de Conciliação:** mesmo valor, data com até ±3 dias de diferença e nome normalizado parecido. A Fatura prevalece em data e valor, e a Categoria escolhida pelo Usuário é mantida.
- **Avisos:** aparecem só dentro do app, no máximo 3 por semana, e o Motor escolhe quais por prioridade. Não há notificação push.
- **Categorias:** as 17 padrão vêm fixas, cada uma com Grupo e palavras-chave, e só podem ser escondidas. As criadas pelo Usuário recebem o Grupo que ele escolher.

## Decisões de teste

- **Um bom teste** verifica só o resultado: dadas estas entradas, o Motor devolve este Plano. Nunca testa como a conta é feita por dentro.
- **Ponto de teste principal:** a função de entrada do Motor. A maioria dos testes passa por ela, com pessoas fictícias (CLT que mora com a família, autônomo endividado, renda variável…).
- **Pontos de teste secundários (puros):** Leitor de lançamento, Importador de fatura (testado com o texto real de uma fatura PicPay, sem dados sensíveis) e Conciliação.
- **Sem teste automático:** Telas e Repositório. São verificados à mão e com a skill `break-ui` (valores extremos, listas vazias, nomes enormes).
- **Ferramenta:** Vitest, com a skill `/tdd` no Motor.
- **Testes existentes para usar de modelo:** nenhum ainda.

## Fora do escopo

- Notificação push e qualquer servidor; Open Finance/Pluggy (fase 2, só para o dono).
- Conta compartilhada ou de casal.
- Trava com Face ID.
- Simulador "E se…" (entra logo depois do MVP).
- Importação de PDF, de outros bancos e do extrato da conta.
- Outros países e moedas.
- Recomendação de produto ou banco específico.

## Observações

- Primeiro usuário: o dono. A primeira Fatura importada é a de novembro/2026, que fecha em 5/12 e é o Mês do plano 0.
- No dia 5/12 o dono traz o texto real da fatura do PicPay, sem o número do cartão, para construir e testar o Importador.
- Telas: Claude Design + impeccable (`shape`, `critique`, `polish`, DESIGN.md) + skills do Emil (`apple-design`, `gestures`, `break-ui`).
