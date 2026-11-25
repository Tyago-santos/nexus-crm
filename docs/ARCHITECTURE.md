# Arquitetura — Nexus CRM AI

## Visão geral
- **Monorepo pnpm**: `apps/web`, `apps/api`, `packages/*`.
- **API stateless** (Fastify) adequada ao Render Free: sem worker, sem filas, sem Redis.
- **Processamento síncrono**: webhook WhatsApp → IA sugere/responde na mesma requisição; follow-ups via endpoint HTTP protegido por segredo.
- **Multi-tenant**: `organization_id` em todas as tabelas de domínio + RLS no Postgres (Supabase).

## Fluxos
### Autenticação
1. `POST /api/auth/login` valida credenciais e emite JWT com `sub`, `organization_id`, `role`.
2. Middlewares `authenticate` + `requirePermission` aplicam RBAC por rota.

### WhatsApp (Meta Cloud)
1. Meta envia `GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...` (verificação).
2. Meta envia `POST /api/webhooks/whatsapp?organization_id=...` com payload `whatsapp_business_account`.
3. API valida assinatura HMAC (`x-hub-signature-256`) quando `META_WA_APP_SECRET` está configurado.
4. `processIncomingMessage` persiste mensagem, qualifica lead, gera sugestão IA e opcionalmente responde (modo automático) — tudo no mesmo request.
5. Webhook idempotente via `webhook_events` (unique org/provider/external_id).

### Follow-up (cron)
- `POST /api/internal/followup/run` com `x-cron-secret` e `{ organization_id }`.
- Executa regras de inatividade (ex.: 48h) e cria tarefas/rascunhos de IA.
- Pode ser chamado manualmente pela UI (`POST /api/automations/run-followup`).

### IA
- Agentes usam **ferramentas controladas** (sem SQL livre) sobre o store/API.
- Tipos: suporte, vendas, analista, follow-up.
- Auditoria em `ai_interactions`.

## Dados e isolamento
- Tabelas: organizations, users, organization_members, customers, leads, deals, tasks, whatsapp_accounts, conversations, messages, webhook_events, activities, ai_interactions, automations, automation_runs.
- Índices por `organization_id` e colunas operacionais.
- RLS: `is_org_member`, `has_org_role`, `current_org_id`, `shares_org`.
- Escrita comercial: owner/admin/manager/seller; conversas: todos; configurações: owner/admin.

## Deploy (Render Free)
- 2 serviços: API (Node) e site estático (Vite build).
- API em modo demonstração (memória) por padrão; migrations Supabase prontas para persistência.
- Baileys não é recomendado no Render Free (processo persistente). Use Meta Cloud API.
- Cold starts são aceitáveis; webhook é stateless.

## Limitações atuais
- API de demonstração em memória (dados reiniciam ao reiniciar o serviço).
- Meta Cloud exige configuração de phone number id, access token e app secret.
- Sem filas: processamento síncrono pode aumentar latência em picos, mas mantém compatibilidade com Render Free.
- Bundle do frontend ~1 MB (code-splitting opcional).
