# 22: Capi nas telas e Capi do dia

**O que construir:** A mascote Capi aparece nos momentos de relação (boas-vindas, onboarding, diagnóstico, lançamento salvo, metas, check-in, fechamento, placar e ajustes), seguindo as regras do DESIGN.md. Na tela inicial, a Capi do dia mostra uma figurinha e uma frase escolhidas pela situação do Usuário.

**Bloqueado por:** 07 (Plano com Tetos e home de 3 blocos), 17 (Avisos dentro do app e dicas)

**Modelo:** Sonnet · Fase C

**Status:** ready-for-agent

- [ ] As poses de `design/capi/` são servidas pelo app e aparecem só nas telas indicadas no DESIGN.md, nunca duas na mesma tela
- [ ] O Motor escolhe a Capi do dia pela situação (Aviso ativo, Meta que andou, dia de Check-in, Anual chegando) e só sorteia quando não há nada a dizer (testes com /tdd)
- [ ] Tocar na Capi do dia leva para a tela ligada à frase
- [ ] A Capi do dia muda no máximo uma vez por dia
- [ ] As imagens respeitam o modo discreto e o tema escuro, sem trocar as cores da mascote
