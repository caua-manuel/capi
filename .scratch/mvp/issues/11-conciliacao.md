# 11: Conciliação entre Fatura, Lançamentos e Fixos

**O que construir:** Ao importar, cada linha da Fatura que já existe como Lançamento manual, do Atalho ou como Fixo no cartão é juntada em vez de duplicada.

**Bloqueado por:** 06 (Cadastro de Fixos), 10 (Importação colando o texto da Fatura do PicPay)

**Modelo:** Opus · Fase B

**Status:** ready-for-agent

- [ ] Junta por mesmo valor, data até ±3 dias e nome parecido (testes com /tdd)
- [ ] A Fatura prevalece em data e valor; a Categoria do Usuário é mantida
- [ ] Lançamentos sem par na Fatura e linhas duvidosas aparecem em "Revisar"
- [ ] Importar a mesma Fatura duas vezes não duplica nada
