-- Nexus CRM AI — isolamento multi-tenant (RLS)
-- Regras:
--   * SELECT: qualquer membro da organização.
--   * Escrita comercial: owner/admin/manager/seller.
--   * Conversas/mensagens: todos os papéis (suporte atende WhatsApp).
--   * Configurações sensíveis: owner/admin.
-- A API usa a service role (bypassa RLS). O RLS protege o acesso direto
-- via PostgREST/Supabase client com o JWT do usuário.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(target_org uuid, allowed text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role = any(allowed)
  );
$$;

create or replace function public.shares_org(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members me
    join public.organization_members other
      on other.organization_id = me.organization_id
    where me.user_id = auth.uid()
      and other.user_id = target_user
  );
$$;

-- Organização ativa: claim organization_id do JWT ou primeiro vínculo do usuário.
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case
      when (auth.jwt() ->> 'organization_id') ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (auth.jwt() ->> 'organization_id')::uuid
    end,
    (
      select m.organization_id
      from public.organization_members m
      where m.user_id = auth.uid()
      order by m.created_at
      limit 1
    )
  );
$$;

-- Preenche organization_id em inserts feitos direto pelo cliente Supabase.
create or replace function public.set_organization_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null then
    new.organization_id := public.current_org_id();
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers', 'leads', 'deals', 'tasks', 'whatsapp_accounts',
    'conversations', 'messages', 'webhook_events', 'activities',
    'ai_interactions', 'automations', 'automation_runs'
  ] loop
    execute format(
      'create trigger %I_set_organization_id before insert on public.%I
       for each row execute function public.set_organization_id()',
      table_name, table_name
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ativa RLS
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.organization_members enable row level security;
alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.deals enable row level security;
alter table public.tasks enable row level security;
alter table public.whatsapp_accounts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.webhook_events enable row level security;
alter table public.activities enable row level security;
alter table public.ai_interactions enable row level security;
alter table public.automations enable row level security;
alter table public.automation_runs enable row level security;

-- ---------------------------------------------------------------------------
-- Organizações, perfis e membros
-- ---------------------------------------------------------------------------

create policy organizations_select on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy organizations_update on public.organizations
  for update to authenticated
  using (public.has_org_role(id, array['owner', 'admin']))
  with check (public.has_org_role(id, array['owner', 'admin']));

create policy users_select on public.users
  for select to authenticated
  using (id = auth.uid() or public.shares_org(id));

create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy members_select on public.organization_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id));

create policy members_manage on public.organization_members
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']))
  with check (public.has_org_role(organization_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- CRM (leitura para todos os membros, escrita comercial)
-- ---------------------------------------------------------------------------

create policy customers_select on public.customers
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy customers_write on public.customers
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin', 'manager', 'seller']))
  with check (public.has_org_role(organization_id, array['owner', 'admin', 'manager', 'seller']));

create policy leads_select on public.leads
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy leads_write on public.leads
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin', 'manager', 'seller']))
  with check (public.has_org_role(organization_id, array['owner', 'admin', 'manager', 'seller']));

create policy deals_select on public.deals
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy deals_write on public.deals
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin', 'manager', 'seller']))
  with check (public.has_org_role(organization_id, array['owner', 'admin', 'manager', 'seller']));

create policy tasks_select on public.tasks
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy tasks_write on public.tasks
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- WhatsApp
-- ---------------------------------------------------------------------------

create policy whatsapp_accounts_select on public.whatsapp_accounts
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy whatsapp_accounts_write on public.whatsapp_accounts
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']))
  with check (public.has_org_role(organization_id, array['owner', 'admin']));

create policy conversations_select on public.conversations
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy conversations_write on public.conversations
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy messages_select on public.messages
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy messages_insert on public.messages
  for insert to authenticated
  with check (public.is_org_member(organization_id));

create policy messages_update on public.messages
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy messages_delete on public.messages
  for delete to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- Inteligência, atividades e automações
-- ---------------------------------------------------------------------------

create policy activities_select on public.activities
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy activities_insert on public.activities
  for insert to authenticated
  with check (public.is_org_member(organization_id));

create policy activities_delete on public.activities
  for delete to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']));

create policy ai_interactions_select on public.ai_interactions
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy ai_interactions_insert on public.ai_interactions
  for insert to authenticated
  with check (public.is_org_member(organization_id));

create policy automations_select on public.automations
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy automations_write on public.automations
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin', 'manager']))
  with check (public.has_org_role(organization_id, array['owner', 'admin', 'manager']));

create policy automation_runs_select on public.automation_runs
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy automation_runs_insert on public.automation_runs
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner', 'admin', 'manager']));

-- webhook_events: apenas service role (nenhuma policy para authenticated).

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
grant execute on function public.shares_org(uuid) to authenticated;
grant execute on function public.current_org_id() to authenticated;
