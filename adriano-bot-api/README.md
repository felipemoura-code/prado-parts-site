# Adriano Soluções — bot WhatsApp (homologação)

Versão 3.4.0. O serviço inicia deliberadamente com **BOT_ACTIVE=false**; nenhuma mensagem é enviada sem a ativação da Cloud API oficial.

Rotas: GET /health; GET /webhook (verificação Meta); POST /webhook (requer assinatura HMAC); GET /admin e GET /api/leads (chave de administrador obrigatória).

Antes de ativar: obter autorização do responsável pelo número, configurar WEBHOOK_VERIFY_TOKEN, META_APP_SECRET, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, ADMIN_API_KEY e WHATSAPP_API_VERSION. Depois de configurar e validar, ativar BOT_ACTIVE=true. Conferir a compatibilidade do WhatsApp Business atual antes de cadastrar o número. Não apagar contas ou conversas.

Dados de clientes: por padrão o JSON é salvo em armazenamento efêmero. **Não usar em produção sem banco durável, backup, política de retenção, controle de acesso e informações de privacidade.** Imagens são referenciadas por ID da Meta, não são armazenadas no painel. O site publicado não depende do bot.
