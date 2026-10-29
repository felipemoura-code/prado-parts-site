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


## Alternativa com Twilio — distinguir os dois ambientes

O bot inclui o adaptador `POST /twilio-sandbox` para o **WhatsApp Sandbox clássico**, que permite receber mensagens e responder por TwiML. Esse adaptador foi desenvolvido, mas **ainda não foi conectado nem testado com sua conta Twilio real**.

**Atenção:** o produto Twilio **Try out WhatsApp** (interface nova usada na conta atual) tem uma limitação documentada: **não aceita resposta direta em TwiML XML** durante o trial. Portanto, não basta colocar a URL `/twilio-sandbox` no campo `Auto-reply → Custom` e esperar um menu interativo. Para usar o Tryout, será necessário adaptar a resposta ao método permitido pela conta. O modo Sandbox clássico e o modo Tryout não são equivalentes.

### Se o ambiente for o Sandbox clássico com suporte a TwiML

1. Entre na conta Twilio, confirme o Sandbox e use o número/`join` mostrados na sua própria tela.
2. Configure **When a message comes in** = `https://adriano-solucoes-bot-teste.onrender.com/twilio-sandbox`, com **POST**.
3. Configure somente no **Render → Environment**:
   - `TWILIO_AUTH_TOKEN` = Auth Token da sua conta Twilio (segredo; não compartilhar no chat).
   - `TWILIO_ALLOWED_NUMBERS` = números que você autorizou para os testes, no formato `55DDDNÚMERO`, apenas dígitos.
   - `TWILIO_WEBHOOK_URL` = URL exata do webhook informado no painel Twilio.
4. Teste a verificação de assinatura e a lista de números autorizados.
5. Somente depois configure `TWILIO_SANDBOX_ACTIVE=true`, mantendo `BOT_ACTIVE=false` para a Meta. Envie `Oi` para testar o menu.
6. Para desligar imediatamente, volte `TWILIO_SANDBOX_ACTIVE=false`.

No WhatsApp **Try out** atualmente utilizado, primeiro verificaremos se há suporte ao método de resposta exigido; não prometemos menus automáticos por TwiML enquanto essa limitação existir.

### Para hospedar na HostGator

Os arquivos `Dockerfile`, `compose.yaml`, `.env.example` e `INSTALAR-HOSTGATOR.md` foram adicionados ao projeto. Será preciso um **VPS** com Node/Docker, HTTPS, backup, conta WhatsApp autorizada e segredos configurados. O servidor é independente do site estático.

**Segurança e limitações:** o bot inicia com envios desligados, valida assinatura Twilio e permite apenas números explicitamente autorizados. Os dados no Render são efêmeros. O uso real exige armazenamento durável, privacidade e uma integração WhatsApp oficial autorizada. Nenhuma conta/número do Adriano é alterada por esse código.

Referências: https://www.twilio.com/docs/usage/trials/try-out-whatsapp e https://www.twilio.com/docs/whatsapp/sandbox
