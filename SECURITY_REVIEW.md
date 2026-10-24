# Prado Parts — Segurança V24 (revisão inicial)

Branch de preparação: `security/hardening-v24`. Nenhuma alteração desta branch deve ser considerada publicada até validação.

## Evidências verificadas
- Site Render estático conectado ao GitHub, branch de produção `main`.
- HTML usa scripts internos e imagens embutidas (data URI). Aplicar CSP genérica pode quebrar a página.
- Formulário de orçamento valida campos no navegador e prepara mensagem do WhatsApp; isso não equivale a envio a servidor.
- Links externos que abrem nova aba incluem `rel="noopener noreferrer"` na amostra examinada.
- A configuração de autenticação em duas etapas de GitHub/Render não é observável pelo código.

## Endurecimento recomendado no Render: Settings → Headers
Aplicar um por vez e verificar no navegador (desktop/mobile), caminho `/*`:
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Frame-Options: DENY` (somente se não houver incorporação legítima do site em iframe)

**Não ativar uma Content-Security-Policy genérica**: requer inventário e testes por causa dos scripts e imagens inline. Também não adicionar HSTS preload antes da migração de domínio e verificação de subdomínios.

## Testes antes de encerrar
1. Confirmar cabeçalhos efetivos via HTTP e HTTPS.
2. Abrir página no computador e celular; checar console e imagens.
3. Preencher formulário e confirmar abertura do WhatsApp, sem enviar dados reais.
4. Testar botões, galeria e links externos.
5. Confirmar 2FA em GitHub e Render e revisar colaboradores autorizados.
6. Examinar repositório completo e arquivos publicados para credenciais, uploads e caminhos inesperados.

Este documento é um plano de implantação: criar o arquivo NÃO configura cabeçalhos no Render.
