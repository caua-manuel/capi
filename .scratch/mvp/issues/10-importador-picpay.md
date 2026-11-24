# 10: Importação colando o texto da Fatura do PicPay

**O que construir:** No Fechamento mensal o Usuário cola o texto da Fatura do PicPay e todos os gastos viram Lançamentos; o que não for categorizado vai para "Revisar".

**Bloqueado por:** 02 (Lançamento rápido escrito)

**Modelo:** Opus · Fase B

**Status:** needs-info (aguardando o texto real da fatura de novembro, que fecha em 5/12)

- [ ] O Importador lê data, Loja, valor, Parcela x/y, IOF e estorno do texto real do PicPay (testes com /tdd usando a fatura real sem dados sensíveis)
- [ ] Ignora pagamento de fatura e estornos, e separa o IOF
- [ ] Parcelas viram compromissos dos meses seguintes
- [ ] Linhas sem Categoria vão para "Revisar" e a escolha vira Regra de estabelecimento
- [ ] O texto colado é descartado depois da Importação
