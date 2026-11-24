# Dados só no aparelho, sem servidor

Todos os dados ficam no banco do navegador (IndexedDB) do aparelho. O app é um PWA estático, hospedado no GitHub Pages com a stack React + TypeScript + Vite, a mesma do Fitnez. A segurança vem de nada sair do celular. O custo é zero e não há login nem servidor para manter. A proteção contra perda é um backup manual em arquivo.

## Consequências
- Não haverá push: push exige servidor. Os Avisos aparecem quando o app é aberto. Lembretes com o app fechado só vêm por automações do app Atalhos do iOS, que mandam uma notificação local sem servidor (ver ADR 0003).
- Open Finance (Pluggy e similares) exige uma chave secreta guardada num servidor, então fica fora do MVP.
- O motor financeiro é um módulo puro, separado da tela, e pode ser testado sem navegador.
