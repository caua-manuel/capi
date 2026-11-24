# 13: Fechamento mensal

**O que construir:** Depois de importar, o Usuário vê o placar do mês, o Plano reajustado e o lembrete de backup. A primeira Fatura vira o Mês do plano 0, sem Tetos, e gera os Tetos seguintes.

**Bloqueado por:** 07 (Plano com Tetos e home de 3 blocos), 11 (Conciliação entre Fatura, Lançamentos e Fixos)

**Modelo:** Sonnet · Fase C

**Status:** ready-for-agent

- [ ] Placar com quantas Categorias ficaram no Teto
- [ ] O Plano do mês seguinte é recalculado com o que aconteceu
- [ ] A primeira Fatura importada conta como Mês do plano 0, sem Tetos
- [ ] Mês estourado não apaga nada e mostra o impacto na data das Metas
- [ ] Lembra de exportar o backup
