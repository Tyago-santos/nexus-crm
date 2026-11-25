-- Nexus CRM AI — schema multi-tenant
-- Aplicar com: supabase db push (ou supabase migration up localmente)
-- Todas as tabelas de domínio carregam organization_id e são protegidas por RLS
-- na migration seguinte (20261123090100_rls.sql).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Organizações, usuários e vínculos
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'starter',
  storage_used_mb integer not null default 0 check (storage_used_mb >= 0),
  storage_limit_mb integer not null default 100 check (storage_limit_mb > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Espelho público de auth.users. Nunca guardamos senhas aqui.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'seller', 'support')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- ---------------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text,
  phone text not null,
  company text,
  document text,
  address text,
  notes text,
  tags text[] not null default '{}',
  assigned_to uuid references public.users (id) on delete set null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, phone),
  unique (id, organization_id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null,
  title text not null,
  source text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'converted', 'lost')),
  assigned_to uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint leads_customer_org_fk
    foreign key (customer_id, organization_id)
    references public.customers (id, organization_id)
    on delete cascade
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null,
  lead_id uuid references public.leads (id) on delete set null,
  title text not null,
  value numeric(14, 2) not null default 0 check (value >= 0),
  stage text not null default 'new_lead'
    check (stage in ('new_lead', 'first_contact', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost')),
  probability smallint not null default 20 check (probability between 0 and 100),
  assigned_to uuid references public.users (id) on delete set null,
  expected_close_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint deals_customer_org_fk
    foreign key (customer_id, organization_id)
    references public.customers (id, organization_id)
    on delete cascade
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  assigned_to uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- WhatsApp
-- ---------------------------------------------------------------------------

create table public.whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  phone_number text not null,
  provider text not null check (provider in ('baileys', 'meta_cloud')),
  connection_status text not null default 'disconnected'
    check (connection_status in ('connected', 'connecting', 'disconnected', 'error')),
  session_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, phone_number),
  unique (id, organization_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  whatsapp_account_id uuid not null,
  customer_id uuid references public.customers (id) on delete set null,
  external_chat_id text not null,
  status text not null default 'open' check (status in ('open', 'pending', 'closed', 'archived')),
  assigned_to uuid references public.users (id) on delete set null,
  ai_mode text not null default 'manual' check (ai_mode in ('manual', 'copilot', 'automatic')),
  unread_count integer not null default 0 check (unread_count >= 0),
  tags text[] not null default '{}',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, whatsapp_account_id, external_chat_id),
  constraint conversations_account_org_fk
    foreign key (whatsapp_account_id, organization_id)
    references public.whatsapp_accounts (id, organization_id)
    on delete cascade
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  conversation_id uuid not null,
  external_message_id text not null,
  sender text not null,
  recipient text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_type text not null default 'text' check (message_type in ('text', 'image', 'document', 'audio', 'video', 'location')),
  content text,
  media_url text,
  status text not null default 'sent' check (status in ('queued', 'sent', 'delivered', 'read', 'failed')),
  created_at timestamptz not null default now(),
  unique (organization_id, external_message_id),
  constraint messages_conversation_org_fk
    foreign key (conversation_id, organization_id)
    references public.conversations (id, organization_id)
    on delete cascade
);

-- Idempotência de webhooks: o mesmo evento nunca é processado duas vezes.
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null check (provider in ('meta_cloud', 'baileys')),
  external_id text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, provider, external_id)
);

-- ---------------------------------------------------------------------------
-- Inteligência, atividades e automações
-- ---------------------------------------------------------------------------

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  user_id uuid references public.users (id) on delete set null,
  activity_type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  agent_type text not null check (agent_type in ('support', 'sales', 'analyst', 'followup')),
  input text not null,
  output text not null,
  model text not null,
  tokens_used integer not null default 0 check (tokens_used >= 0),
  created_at timestamptz not null default now()
);

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null,
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  automation_id uuid not null,
  status text not null default 'success' check (status in ('success', 'error', 'skipped')),
  detail text,
  created_at timestamptz not null default now(),
  constraint automation_runs_automation_org_fk
    foreign key (automation_id, organization_id)
    references public.automations (id, organization_id)
    on delete cascade
);

-- ---------------------------------------------------------------------------
-- Índices operacionais
-- ---------------------------------------------------------------------------

create index organizations_slug_idx on public.organizations (slug);
create index organization_members_user_idx on public.organization_members (user_id);
create index organization_members_org_role_idx on public.organization_members (organization_id, role);

create index customers_org_name_idx on public.customers (organization_id, name);
create index customers_org_assigned_idx on public.customers (organization_id, assigned_to);
create index customers_tags_gin_idx on public.customers using gin (tags);

create index leads_org_status_idx on public.leads (organization_id, status);
create index leads_customer_idx on public.leads (customer_id);
create index leads_assigned_idx on public.leads (organization_id, assigned_to);

create index deals_org_stage_idx on public.deals (organization_id, stage);
create index deals_customer_idx on public.deals (customer_id);
create index deals_assigned_idx on public.deals (organization_id, assigned_to);
create index deals_expected_close_idx on public.deals (organization_id, expected_close_date);

create index tasks_org_status_due_idx on public.tasks (organization_id, status, due_date);
create index tasks_assigned_idx on public.tasks (organization_id, assigned_to);
create index tasks_customer_idx on public.tasks (customer_id);

create index whatsapp_accounts_org_idx on public.whatsapp_accounts (organization_id);

create index conversations_org_last_message_idx on public.conversations (organization_id, last_message_at desc);
create index conversations_org_status_idx on public.conversations (organization_id, status);
create index conversations_assigned_idx on public.conversations (organization_id, assigned_to);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index messages_org_created_idx on public.messages (organization_id, created_at desc);

create index webhook_events_org_created_idx on public.webhook_events (organization_id, created_at desc);

create index activities_org_created_idx on public.activities (organization_id, created_at desc);
create index activities_customer_created_idx on public.activities (customer_id, created_at desc);

create index ai_interactions_org_created_idx on public.ai_interactions (organization_id, created_at desc);
create index ai_interactions_conversation_idx on public.ai_interactions (conversation_id);

create index automations_org_active_idx on public.automations (organization_id, is_active);
create index automation_runs_org_created_idx on public.automation_runs (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations', 'users', 'customers', 'leads', 'deals',
    'tasks', 'whatsapp_accounts', 'conversations', 'automations'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end;
$$;

-- Cria o perfil público quando um usuário é criado no Supabase Auth.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.users.full_name, excluded.full_name),
        updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
