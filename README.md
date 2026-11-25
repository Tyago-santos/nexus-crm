# Nexus CRM AI

CRM multi-tenant com WhatsApp e agentes de IA controlados por ferramentas. Projetado para **Render Free** (sem worker, sem filas, sem Redis).

## Funcionalidades
- Autenticação JWT com RBAC (owner, admin, manager, seller, support)
- Clientes, leads, pipeline (7 estágios), tarefas e equipa
- WhatsApp em 3 colunas (manual, copiloto, automático) com Meta Cloud API stateless
- Assistente IA (chat, resumo de conversa, qualificação de lead, sugestão de resposta)
- Automações síncronas + endpoint de follow-up para cron HTTP
- Relatórios e dashboard com funil e insights
- Multi-tenant com RLS (Supabase) e isolamento por organização
- Demo mode com dados de exemplo

## Stack
- Frontend: React 19 + TypeScript + Vite + Tailwind v4 + TanStack Query
- Backend: Fastify + TypeScript + Zod
- Banco: Supabase (Postgres + RLS) — migrations em `supabase/`
- WhatsApp: Baileys (local/VPS) ou Meta Cloud API (Render Free)
- Processamento: **síncrono na API**, sem BullMQ/Redis

## Estrutura
```
apps/web          # SPA React
apps/api          # Fastify API
packages/schemas  # Zod schemas compartilhados
packages/shared   # utilitários (telefone, RBAC, estágios, idempotência)
packages/types    # tipos compartilhados
supabase/         # migrations + seed
design/stitch/    # referências visuais (Google Stitch)
```

## Como rodar local
```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm dev
```
- API: http://localhost:3333 (docs em /docs)
- Web: http://localhost:5173

Credenciais de demonstração: `camila@nexus.ai` / `nexus123` (owner), `rafael@nexus.ai` (seller), `marina@nexus.ai` (manager), `eva@rival.ai` (outra org).

## Verificações
```bash
pnpm typecheck
pnpm test
pnpm build
```

## Supabase (schema + RLS)
```bash
supabase link --project-ref <ref>
supabase db push
# ou localmente:
supabase db reset
```
As migrations criam todas as tabelas, índices, RLS por organização e o seed de demonstração (senha `nexus123`).
A API atual funciona em modo demonstração (memória); as migrations são a base para persistência via Supabase.

## Deploy no Render Free
1. Crie o serviço a partir de `render.yaml` (Blueprint).
2. No serviço web (API), defina `WEB_ORIGIN` com a URL do site estático (ex.: `https://nexus-crm-web.onrender.com`).
3. No site estático, defina `VITE_API_URL` com `https://nexus-crm-api.onrender.com/api`.
4. Para WhatsApp em produção: `WHATSAPP_PROVIDER=meta_cloud` + `META_WA_PHONE_NUMBER_ID`, `META_WA_ACCESS_TOKEN`, `META_WA_APP_SECRET`.
5. Para rotinas sem worker, configure um cron externo (cron-job.org) chamando `POST /api/internal/followup/run` com header `x-cron-secret: <CRON_SECRET>` e body `{ "organization_id": "<uuid>" }`.
6. Webhook Meta: `https://nexus-crm-api.onrender.com/api/webhooks/whatsapp?organization_id=<uuid>` com verify token = `WEBHOOK_SECRET`.

## Arquitetura
Veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
