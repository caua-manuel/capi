# 14: Previsão de fatura por Categoria

**O que construir:** A home mostra a Previsão da próxima Fatura e os dias até o fechamento; tocando, ela abre por Categoria com as Lojas que mais pesaram.

**Bloqueado por:** 07 (Plano com Tetos e home de 3 blocos), 10 (Importação colando o texto da Fatura do PicPay), 12 (Detecção de Recorrentes)

**Modelo:** Opus · Fase B

**Status:** ready-for-agent

- [ ] Soma Lançamentos do ciclo atual, Parcelas, Recorrentes e Fixos no cartão que ainda vão cair (testes com /tdd)
- [ ] Separa por Categoria e mostra as Lojas que mais pesaram em cada uma
- [ ] Respeita a data de fechamento do cartão do Usuário
