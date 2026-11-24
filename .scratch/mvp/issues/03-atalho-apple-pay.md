# 03: Lançamento pelo Atalho do Apple Pay

**O que construir:** Pagar por aproximação (crédito ou débito) dispara uma automação do Atalhos que abre o app com valor e Loja preenchidos; o Usuário só confirma a Categoria.

**Bloqueado por:** 02 (Lançamento rápido escrito)

**Modelo:** Sonnet · Fase A

**Status:** ready-for-agent

- [ ] A rota de lançamento aceita `valor`, `loja` e `origem` e abre o lançamento preenchido (ADR 0003)
- [ ] Valores e nomes com acento ou espaço chegam corretos
- [ ] O Lançamento guarda a origem `applepay`
- [ ] Existe uma tela com o passo a passo, com prints, para criar a automação de Transação no app Atalhos
