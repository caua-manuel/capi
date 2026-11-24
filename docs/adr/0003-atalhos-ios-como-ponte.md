# Atalhos do iOS como ponte para o app

Um PWA não recebe dados do Apple Pay nem agenda notificações sem servidor. Por isso usamos automações do app Atalhos como ponte. A automação de Transação (pagamento por aproximação, no crédito ou no débito) abre o app por uma URL com valor e loja já preenchidos. As automações de horário mostram uma notificação local que abre o app. Esse formato de URL é um contrato público: os Atalhos já instalados pelos usuários dependem dele, então ele não pode mudar sem manter compatibilidade.
