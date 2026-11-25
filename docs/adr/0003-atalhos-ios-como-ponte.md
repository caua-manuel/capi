# Atalhos do iOS como ponte para o app

O app Atalhos recebe a Transação do Apple Pay (pagamento por aproximação, no crédito ou no débito). A URL de entrada abre o Safari no iPhone, onde o Capi usa um armazenamento separado do app instalado. A prova de Web Push verifica se tocar em uma notificação abre o Capi instalado a partir do iOS 16.4.

A automação de Transação envia o valor e a Loja à ponte do ADR 0002. O push leva ao Capi instalado, que lê os Pendentes e abre o Novo gasto para o Usuário confirmar a Categoria. As automações de horário continuam usando notificações locais.

O guia em Ajustes orienta novas automações a usar a ação Obter Conteúdo do URL com `POST /pagamento`. Os Atalhos existentes podem continuar usando a URL de entrada. Os parâmetros `valor`, `loja` e `origem` formam um contrato público e seguem compatíveis.
