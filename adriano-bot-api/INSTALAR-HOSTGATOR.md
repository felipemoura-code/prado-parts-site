# Adriano Soluções Bot — implantação futura na HostGator VPS

A versão de testes já está hospedada no Render. Para migrar, use **VPS com Node.js/Docker**, não uma hospedagem compartilhada simples. O site estático pode ser hospedado separadamente.

## Segurança antes da migração

- O bot **não deve** responder números reais sem autorização.
- Preserve `BOT_ACTIVE=false` e `TWILIO_SANDBOX_ACTIVE=false` inicialmente.
- Não coloque o WhatsApp pessoal de Adriano (19) 98159-5823 na API sem um plano de migração autorizado.
- Cada empresa cliente deverá ter sua própria conta/número autorizado. Este projeto ainda é de **uma empresa** e não inclui isolamento multiempresa.
- A entrada Twilio em `/twilio-sandbox` usa TwiML do Sandbox tradicional. O fluxo Twilio *Try out WhatsApp* mais recente tem limitações diferentes e não suporta TwiML XML direto; requer verificar o tipo de teste antes da ativação.

## Instalar

1. Contrate um VPS com acesso SSH/root e atualizações de segurança.
2. Instale Docker Engine + Docker Compose e configure firewall, SSH por chave e backups.
3. Coloque a pasta `adriano-bot-api` na VPS.
4. Copie `.env.example` para `.env`, preencha segredos SOMENTE no servidor; `chmod 600 .env`.
5. Rode `docker compose up -d --build` no diretório do bot.
6. Configure DNS de um subdomínio, por exemplo `bot.seudominio.com.br`, apontando para o IP do VPS.
7. Instale reverse proxy HTTPS (Caddy, Nginx + Let's Encrypt); direcione o subdomínio para `127.0.0.1:3000`. Nunca exponha a porta 3000 diretamente.
8. Confirme `https://bot.seudominio.com.br/health` antes de cadastrar webhooks.
9. Configure `TWILIO_WEBHOOK_URL=https://bot.seudominio.com.br/twilio-sandbox` exatamente como no painel Twilio. A URL precisa coincidir para a validação de assinatura.
10. Quando houver credenciais, número de teste autorizado e confirmação da conexão, ative somente o canal usado. Não altere o outro.
11. Verifique `docker compose logs`, faça teste real e monitore reinícios.

## Dados, LGPD e disponibilidade

O volume Docker preserva os arquivos entre reinícios normais, mas não substitui backup externo, monitoramento nem banco de dados robusto. Pedidos contêm dados pessoais e endereços; defina quem acessa, finalidade e retenção. Não considerar este protótipo pronto para uso comercial com múltiplos clientes sem reforçar persistência, autenticação, logs, monitoramento, testes de carga e tratamento de eventos.
