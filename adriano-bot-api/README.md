# Adriano Soluções — Bot WhatsApp (homologação segura)

**Status:** o site funciona, mas o WhatsApp pessoal (19) 98159-5823 **não está conectado** à Cloud API. O servidor Render foi preparado para rodar em modo de teste e permanece com `BOT_ACTIVE=false`.

## Primeiro teste — sem alterar o número do Adriano
1. Acesse https://developers.facebook.com/apps e entre com a conta Meta autorizada pela empresa.
2. Crie um aplicativo para mensagens comerciais e adicione WhatsApp; use o número **de teste** fornecido pela Meta. Não cadastre o telefone real.
3. Em WhatsApp > API Setup / Configuração da API, consulte o `Phone number ID` do número de teste e o token temporário.
4. Na configuração de webhooks do app Meta, defina a URL **https://adriano-solucoes-bot-teste.onrender.com/webhook** e selecione o campo `messages`. O `Verify Token` deve corresponder exatamente ao `WEBHOOK_VERIFY_TOKEN` configurado no Render.
5. Em https://dashboard.render.com/web/srv-dbh8ke1srm7s73f41u8g > Environment, preencha manualmente as credenciais (não compartilhe tokens no ChatGPT):
   - `META_APP_SECRET`: segredo do app Meta, em App Settings > Basic.
   - `WEBHOOK_VERIFY_TOKEN`: segredo de verificação definido por você (um valor longo e aleatório).
   - `WHATSAPP_ACCESS_TOKEN`: token temporário do app Meta para o teste.
   - `WHATSAPP_PHONE_NUMBER_ID`: ID do número **de teste** da Meta, não o número visível.
   - `ADMIN_API_KEY`: senha aleatória forte (ao menos 24 caracteres), exclusiva para o painel.
   - `BOT_MODE=test`, `PRODUCTION_APPROVED=false`.
   - `TEST_ALLOWED_NUMBERS`: celulares de teste autorizados, separados por vírgulas, usando 55+DDD+número, apenas dígitos. Cadastre também esses contatos como destinatários de teste na Meta.
6. **Só após verificar a URL de webhook, a assinatura, as credenciais e os números autorizados**, habilite `BOT_ACTIVE=true` no Render. Antes disso deixe `false`.

## Segurança e limitações
- POST /webhook verifica assinatura SHA-256 do app Meta. O servidor não responde a números fora da lista no modo de teste.
- GET /health indica estado do servidor. GET /admin exibe o painel, mas os pedidos só são retornados por GET /api/leads com `Authorization: Bearer <ADMIN_API_KEY>`.
- O código evita duplicidade básica de mensagens, mas o JSON local do Render free é **efêmero**; não usar em produção antes de configurar armazenamento persistente, backup e regras de retenção de dados e privacidade.
- O WhatsApp normal do Adriano não suporta coexistência direta com Cloud API. Para manter atendimento no app é necessário planejar migração para WhatsApp Business e verificar elegibilidade de coexistência, sem excluir a conta nem apagar conversas sem autorização e backup.
- O simulador web pode ser usado independentemente da Meta.

**Projeto de testes:** https://adriano-solucoes-teste.onrender.com/simulador-bot.html
