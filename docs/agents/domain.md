# Documentos de domínio

Repositório de contexto único: um `GLOSSARY.md` na raiz e as decisões em `docs/adr/`.

## Antes de explorar, ler

- `GLOSSARY.md`: o vocabulário oficial.
- `docs/adr/`: as decisões que tocam a área em que você vai trabalhar.
- `docs/motor-financeiro.md`: as regras e fórmulas financeiras (fonte da verdade).

## Usar o vocabulário do glossário

Em títulos de issue, nomes de testes, nomes no código e textos, usar o termo exatamente como está no `GLOSSARY.md`. Nunca usar os sinônimos da lista _Evitar_. Se faltar um termo, anotar para a skill `/domain-modeling`; não inventar.

## Sinalizar conflito com ADR

Se o que você vai fazer contradiz um ADR, diga isso explicitamente antes de seguir: "_Contradiz o ADR 0002 (sem servidor), mas vale reabrir porque…_".
