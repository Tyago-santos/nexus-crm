-- Nexus CRM AI — dados de demonstração
-- Senha de todos os usuários demo: nexus123
-- Executado automaticamente por `supabase db reset` (seed.sql).
-- Em projeto remoto, rode com consciência: os registros são idempotentes por ID.

begin;

-- ---------------------------------------------------------------------------
-- Usuários de demonstração (Supabase Auth + perfil público)
-- ---------------------------------------------------------------------------

create or replace function public.__seed_auth_user(uid uuid, user_email text, user_name text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if exists (select 1 from auth.users where id = uid) then
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    uid,
    'authenticated',
    'authenticated',
    user_email,
    crypt('nexus123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', user_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    uid,
    uid::text,
    jsonb_build_object('sub', uid::text, 'email', user_email),
    'email',
    now(),
    now(),
    now()
  );
end;
$$;

select public.__seed_auth_user('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'camila@nexus.ai', 'Camila Duarte');
select public.__seed_auth_user('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'rafael@nexus.ai', 'Rafael Nunes');
select public.__seed_auth_user('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'marina@nexus.ai', 'Marina Duarte');
select public.__seed_auth_user('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'eva@rival.ai', 'Eva Rival');

insert into public.users (id, full_name, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Camila Duarte', 'camila@nexus.ai'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Rafael Nunes', 'rafael@nexus.ai'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Marina Duarte', 'marina@nexus.ai'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Eva Rival', 'eva@rival.ai')
on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      updated_at = now();

drop function public.__seed_auth_user(uuid, text, text);

-- ---------------------------------------------------------------------------
-- Organizações e vínculos
-- ---------------------------------------------------------------------------

insert into public.organizations (id, name, slug, plan, storage_used_mb, storage_limit_mb) values
  ('11111111-1111-4111-8111-111111111111', 'TechVentures Brasil', 'techventures-brasil', 'enterprise', 68400, 102400),
  ('22222222-2222-4222-8222-222222222222', 'Organização Concorrente', 'org-concorrente', 'starter', 120, 1024)
on conflict (id) do nothing;

insert into public.organization_members (id, organization_id, user_id, role) values
  ('e0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'owner'),
  ('e0000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'seller'),
  ('e0000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'manager'),
  ('e0000004-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'owner')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------

insert into public.customers
  (id, organization_id, name, email, phone, company, document, address, notes, tags, assigned_to, created_by, created_at)
values
  ('c0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Lucas Menezes', 'lucas@datacore.io', '+5511984529901', 'DataCore Sistemas SaaS', '12.345.678/0001-90', 'Av. Paulista, 1000 - São Paulo, SP', 'Head de Inovação & Vendas. Empresa expandindo para 3 novas filiais.', array['Enterprise SaaS','TomadorDeDecisão','Tier 1'], 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '13 days'),
  ('c0000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Mariana Albuquerque', 'mariana@vflow.com.br', '+5541991204412', 'VFlow Logística Global', null, 'Curitiba, PR', 'Avaliando integração com ERP.', array['Logística','Em Negociação'], 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '22 days'),
  ('c0000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Dr. Rodrigo Prado', 'rodrigo.prado@nexushealth.med', '+5521987221088', 'Rede Hospitais Nexus Health', null, 'Rio de Janeiro, RJ', 'Onboarding em andamento.', array['Healthcare','Onboarding'], 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '31 days'),
  ('c0000004-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Helena Brandão', 'helena.brandao@finpeak.com', '+5511971349002', 'FinPeak Wealth Management', null, 'São Paulo, SP', 'Interesse em automação de follow-up.', array['Finanças','Ativo'], 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '40 days'),
  ('c0000005-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Carlos Eduardo Mendes', 'mendes@agrotech.ind.br', '+5567996513329', 'AgroTech Monitoramento', null, 'Campo Grande, MS', 'Risco de churn por falta de resposta.', array['Agro','Churn Risk'], 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '49 days'),
  ('c0000006-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'Juliana Meireles', 'juliana@fintechvanguard.com', '+5511912345678', 'Fintech Vanguard', null, 'São Paulo, SP', 'Minuta de contrato visualizada 4x.', array['Fintech','Enterprise'], 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '58 days'),
  ('c0000007-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'Mariana Prado', 'mariana@somasaude.com.br', '+5511998877665', 'Grupo Soma Saúde', null, 'Belo Horizonte, MG', '120 licenças em avaliação.', array['Healthcare','PrioridadeAlta'], 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '67 days'),
  ('c0000008-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'Rodrigo Borges', 'rodrigo@atlaslog.com.br', '+5511997766554', 'Atlas Logística', null, 'Santos, SP', 'Integração API em testes.', array['Logística','API'], 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '76 days'),
  ('c0000009-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', 'Beatriz Lima', 'beatriz@nexpay.com', '+5511996655443', 'NexPay Soluções', null, 'São Paulo, SP', 'Plano Scale.', array['Fintech','Scale'], 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '85 days'),
  ('c0000010-0000-4000-8000-000000000010', '11111111-1111-4111-8111-111111111111', 'Fernanda Lemos', 'fernanda@solarenergia.com', '+5511995544332', 'Solaris Energia', null, 'Campinas, SP', 'Inbound via landing page.', array['Energia','Inbound'], 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '94 days'),
  ('c0000011-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'Beto Castro', 'beto@logicargo.com', '+5511994433221', 'LogiCargo Express', null, 'Guarulhos, SP', 'Lead qualificado pelo WhatsApp.', array['Logística','Qualificado'], 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '103 days'),
  ('c0000012-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'Dr. Henrique Viana', 'henrique@healthcareplus.com', '+5511993322110', 'HealthCare Plus', null, 'São Paulo, SP', 'Demonstração agendada.', array['Healthcare','Demo'], 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '112 days')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------

insert into public.leads (id, organization_id, customer_id, title, source, status, assigned_to, created_at, updated_at) values
  ('f0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'c0000001-0000-4000-8000-000000000001', 'DataCore — Expansão Enterprise', 'WhatsApp', 'qualified', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '12 days', now() - interval '12 days'),
  ('f0000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'c0000002-0000-4000-8000-000000000002', 'VFlow — Integração ERP', 'Indicação', 'contacted', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', now() - interval '9 days', now() - interval '9 days'),
  ('f0000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'c0000005-0000-4000-8000-000000000005', 'AgroTech — Retomada', 'Inbound', 'new', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', now() - interval '2 days', now() - interval '2 days'),
  ('f0000004-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'c0000006-0000-4000-8000-000000000006', 'Fintech Vanguard — Suite Enterprise', 'Evento', 'qualified', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '20 days', now() - interval '20 days'),
  ('f0000005-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'c0000010-0000-4000-8000-000000000010', 'Solaris — Automação Comercial', 'Landing Page', 'new', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '1 day', now() - interval '1 day'),
  ('f0000006-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'c0000011-0000-4000-8000-000000000011', 'LogiCargo — WhatsApp Bot', 'WhatsApp', 'qualified', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', now() - interval '5 days', now() - interval '5 days'),
  ('f0000007-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'c0000007-0000-4000-8000-000000000007', 'Soma Saúde — 120 Licenças', 'Outbound', 'contacted', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', now() - interval '14 days', now() - interval '14 days'),
  ('f0000008-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'c0000003-0000-4000-8000-000000000003', 'Nexus Health — Onboarding', 'Parceria', 'converted', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', now() - interval '40 days', now() - interval '40 days')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Oportunidades
-- ---------------------------------------------------------------------------

insert into public.deals
  (id, organization_id, customer_id, lead_id, title, value, stage, probability, assigned_to, expected_close_date, created_at, updated_at)
values
  ('a0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'c0000005-0000-4000-8000-000000000005', 'f0000003-0000-4000-8000-000000000003', 'AgroTech — Monitoramento Enterprise', 32000, 'new_lead', 65, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_date + 20, now() - interval '4 days', now() - interval '2 days'),
  ('a0000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'c0000010-0000-4000-8000-000000000010', 'f0000005-0000-4000-8000-000000000005', 'Solaris — Automação Comercial', 64000, 'new_lead', 48, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', current_date + 30, now() - interval '2 days', now()),
  ('a0000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'c0000002-0000-4000-8000-000000000002', 'f0000002-0000-4000-8000-000000000002', 'VFlow — Integração Omnichannel', 45000, 'first_contact', 55, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', current_date + 25, now() - interval '8 days', now() - interval '6 days'),
  ('a0000004-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'c0000011-0000-4000-8000-000000000011', 'f0000006-0000-4000-8000-000000000006', 'LogiCargo — WhatsApp Bot', 33500, 'first_contact', 62, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', current_date + 18, now() - interval '6 days', now() - interval '4 days'),
  ('a0000005-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'c0000006-0000-4000-8000-000000000006', 'f0000004-0000-4000-8000-000000000004', 'Fintech Vanguard — Suite Enterprise', 85000, 'qualified', 88, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_date + 12, now() - interval '18 days', now() - interval '16 days'),
  ('a0000006-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'c0000012-0000-4000-8000-000000000012', null, 'HealthCare Plus — CRM Clínico', 57000, 'qualified', 74, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', current_date + 22, now() - interval '15 days', now() - interval '13 days'),
  ('a0000007-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'c0000001-0000-4000-8000-000000000001', 'f0000001-0000-4000-8000-000000000001', 'DataCore — Expansão Multi-Filiais', 74400, 'proposal_sent', 92, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_date + 4, now() - interval '22 days', now() - interval '20 days'),
  ('a0000008-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'c0000007-0000-4000-8000-000000000007', 'f0000007-0000-4000-8000-000000000007', 'Grupo Nexus Sul — 120 Licenças', 120600, 'proposal_sent', 70, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', current_date + 9, now() - interval '17 days', now() - interval '15 days'),
  ('a0000009-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', 'c0000008-0000-4000-8000-000000000008', null, 'Atlas — Integração API', 29500, 'negotiation', 81, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', current_date + 7, now() - interval '12 days', now() - interval '10 days'),
  ('a0000010-0000-4000-8000-000000000010', '11111111-1111-4111-8111-111111111111', 'c0000009-0000-4000-8000-000000000009', null, 'NexPay — Plano Scale', 24000, 'negotiation', 76, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', current_date + 10, now() - interval '11 days', now() - interval '9 days'),
  ('a0000011-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'c0000003-0000-4000-8000-000000000003', 'f0000008-0000-4000-8000-000000000008', 'Nexus Health — Onboarding', 48000, 'won', 100, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', current_date - 5, now() - interval '40 days', now() - interval '38 days'),
  ('a0000012-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'c0000004-0000-4000-8000-000000000004', null, 'FinPeak — Automação de Follow-up', 26500, 'lost', 0, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_date - 8, now() - interval '35 days', now() - interval '33 days'),
  ('a0000013-0000-4000-8000-000000000013', '11111111-1111-4111-8111-111111111111', 'c0000001-0000-4000-8000-000000000001', null, 'DataCore — Licenças Adicionais', 52000, 'won', 100, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_date - 2, now() - interval '42 days', now() - interval '40 days'),
  ('a0000014-0000-4000-8000-000000000014', '11111111-1111-4111-8111-111111111111', 'c0000010-0000-4000-8000-000000000010', null, 'Solaris — Módulo IA', 38000, 'won', 100, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', current_date - 3, now() - interval '30 days', now() - interval '28 days'),
  ('a0000015-0000-4000-8000-000000000015', '11111111-1111-4111-8111-111111111111', 'c0000007-0000-4000-8000-000000000007', null, 'Grupo Nexus Sul — Expansão', 46000, 'won', 100, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', current_date - 4, now() - interval '28 days', now() - interval '26 days')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Tarefas
-- ---------------------------------------------------------------------------

insert into public.tasks
  (id, organization_id, customer_id, deal_id, assigned_to, title, description, status, priority, due_date, created_at, updated_at)
values
  ('b0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'c0000007-0000-4000-8000-000000000007', 'a0000008-0000-4000-8000-000000000008', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Call de alinhamento', 'Google Meet pronto. Revisar proposta antes da call.', 'pending', 'high', now() + interval '3 hours', now() - interval '1 day', now()),
  ('b0000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'c0000006-0000-4000-8000-000000000006', 'a0000005-0000-4000-8000-000000000005', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Enviar minuta contratual', 'Minuta revisada pela IA.', 'pending', 'urgent', now() + interval '5 hours', now() - interval '2 days', now()),
  ('b0000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', null, null, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Revisão semanal do pipeline', 'Sala principal com o time comercial.', 'pending', 'medium', now() + interval '7 hours', now() - interval '3 days', now()),
  ('b0000004-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'c0000005-0000-4000-8000-000000000005', 'a0000001-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Follow-up com AgroTech', 'Lead sem resposta há 52 horas.', 'pending', 'urgent', now() + interval '2 hours', now() - interval '4 days', now()),
  ('b0000005-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'c0000012-0000-4000-8000-000000000012', 'a0000006-0000-4000-8000-000000000006', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Preparar demo técnica', 'Demonstração do módulo WhatsApp.', 'in_progress', 'high', now() + interval '26 hours', now() - interval '5 days', now()),
  ('b0000006-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'c0000003-0000-4000-8000-000000000003', 'a0000011-0000-4000-8000-000000000011', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Onboarding Nexus Health', 'Kickoff concluído.', 'done', 'medium', now() - interval '20 hours', now() - interval '6 days', now()),
  ('b0000007-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'c0000004-0000-4000-8000-000000000004', 'a0000012-0000-4000-8000-000000000012', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Reengajar FinPeak', 'Cliente postergou decisão.', 'cancelled', 'low', now() - interval '48 hours', now() - interval '7 days', now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- WhatsApp
-- ---------------------------------------------------------------------------

insert into public.whatsapp_accounts
  (id, organization_id, phone_number, provider, connection_status, session_reference, created_at, updated_at)
values
  ('90000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '+551132908800', 'meta_cloud', 'connected', null, now() - interval '90 days', now())
on conflict (id) do nothing;

insert into public.conversations
  (id, organization_id, whatsapp_account_id, customer_id, external_chat_id, status, assigned_to, ai_mode, unread_count, tags, last_message_at, created_at, updated_at)
values
  ('d0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '90000000-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000001', '5511984529901@s.whatsapp.net', 'open', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'copilot', 1, array['Proposta Enviada','IA Copilot'], now() - interval '8 minutes', now() - interval '31 days', now() - interval '8 minutes'),
  ('d0000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', '90000000-0000-4000-8000-000000000001', 'c0000009-0000-4000-8000-000000000009', '5511996655443@s.whatsapp.net', 'pending', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'copilot', 0, array['Pós-venda'], now() - interval '35 minutes', now() - interval '32 days', now() - interval '35 minutes'),
  ('d0000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', '90000000-0000-4000-8000-000000000001', 'c0000011-0000-4000-8000-000000000011', '5511994433221@s.whatsapp.net', 'open', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'automatic', 0, array['Qualificado'], now() - interval '110 minutes', now() - interval '33 days', now() - interval '110 minutes'),
  ('d0000004-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', '90000000-0000-4000-8000-000000000001', 'c0000002-0000-4000-8000-000000000002', '5541991204412@s.whatsapp.net', 'pending', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'manual', 2, array['Negociação'], now() - interval '260 minutes', now() - interval '34 days', now() - interval '260 minutes'),
  ('d0000005-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', '90000000-0000-4000-8000-000000000001', 'c0000010-0000-4000-8000-000000000010', '5511994433222@s.whatsapp.net', 'open', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'automatic', 0, array['Agendamento'], now() - interval '410 minutes', now() - interval '35 days', now() - interval '410 minutes'),
  ('d0000006-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', '90000000-0000-4000-8000-000000000001', 'c0000012-0000-4000-8000-000000000012', '5511993322110@s.whatsapp.net', 'open', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'copilot', 1, array['Demo'], now() - interval '620 minutes', now() - interval '36 days', now() - interval '620 minutes'),
  ('d0000007-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', '90000000-0000-4000-8000-000000000001', 'c0000004-0000-4000-8000-000000000004', '5511971349002@s.whatsapp.net', 'archived', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'manual', 0, array['Financeiro'], now() - interval '2800 minutes', now() - interval '37 days', now() - interval '2800 minutes')
on conflict (id) do nothing;

insert into public.messages
  (id, organization_id, conversation_id, external_message_id, sender, recipient, direction, message_type, content, media_url, status, created_at)
values
  ('ab000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'wamid.demo.1', 'Lucas Menezes', '+551132908800', 'inbound', 'text', 'Olá Camila! Estava revendo a minuta do contrato com nosso Diretor de TI. Ele levantou uma dúvida importante sobre o suporte: o plano Enterprise realmente cobre SLA de 1 hora para incidentes críticos em finais de semana?', null, 'read', now() - interval '38 minutes'),
  ('ab000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'wamid.demo.2', 'Camila Duarte', '+5511984529901', 'outbound', 'text', 'Com certeza, Lucas! Nosso SLA para incidentes de Severidade 1 é garantido em contrato em até 45 minutos com canal direto via WhatsApp e pager dedicado 24/7.', null, 'read', now() - interval '34 minutes'),
  ('ab000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'wamid.demo.3', 'Camila Duarte', '+5511984529901', 'outbound', 'text', 'Segue também a versão final do contrato para assinatura digital: Nexus_SLA_Enterprise_2025.pdf', null, 'read', now() - interval '33 minutes'),
  ('ab000004-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'wamid.demo.4', 'Lucas Menezes', '+551132908800', 'inbound', 'text', 'Perfeito! Conseguem faturar com o CNPJ da nossa holding controladora? Me indica os dados bancários para eu validar com o financeiro.', null, 'read', now() - interval '8 minutes'),
  ('ab000005-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'd0000002-0000-4000-8000-000000000002', 'wamid.demo.5', 'Beatriz Lima', '+551132908800', 'inbound', 'text', 'Oi Rafael, tudo bem? Podemos revisar a fatura da renovação? Preciso do detalhamento dos usuários ativos.', null, 'read', now() - interval '42 minutes'),
  ('ab000006-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'd0000002-0000-4000-8000-000000000002', 'wamid.demo.6', 'Rafael Nunes', '+5511996655443', 'outbound', 'text', 'Claro, Beatriz! Vou preparar o detalhamento e te envio ainda hoje.', null, 'read', now() - interval '35 minutes'),
  ('ab000007-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'wamid.demo.7', 'Beto Castro', '+551132908800', 'inbound', 'text', 'Olá! Quero entender o prazo de integração com nosso sistema de logística. Vocês têm API?', null, 'read', now() - interval '140 minutes'),
  ('ab000008-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'wamid.demo.8', 'Nexus IA', '+5511994433221', 'outbound', 'text', 'Olá Beto! Sim, temos API REST e webhooks. A integração padrão leva de 5 a 7 dias úteis. Posso agendar uma demo técnica?', null, 'read', now() - interval '110 minutes'),
  ('ab000009-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', 'd0000004-0000-4000-8000-000000000004', 'wamid.demo.9', 'Mariana Albuquerque', '+551132908800', 'inbound', 'text', 'Vocês conseguem incluir cláusula de LGPD no contrato?', null, 'read', now() - interval '300 minutes'),
  ('ab000010-0000-4000-8000-000000000010', '11111111-1111-4111-8111-111111111111', 'd0000004-0000-4000-8000-000000000004', 'wamid.demo.10', 'Mariana Albuquerque', '+551132908800', 'inbound', 'text', 'E qual seria o prazo para go-live?', null, 'read', now() - interval '260 minutes'),
  ('ab000011-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'd0000006-0000-4000-8000-000000000006', 'wamid.demo.11', 'Dr. Henrique Viana', '+551132908800', 'inbound', 'text', 'Confirmado para amanhã às 14h. Pode enviar o link?', null, 'read', now() - interval '660 minutes'),
  ('ab000012-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', 'd0000006-0000-4000-8000-000000000006', 'wamid.demo.12', 'Marina Duarte', '+5511993322110', 'outbound', 'text', 'Perfeito, Dr. Henrique! Segue o link da demonstração. Até amanhã!', null, 'read', now() - interval '620 minutes')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Atividades
-- ---------------------------------------------------------------------------

insert into public.activities (id, organization_id, customer_id, user_id, activity_type, description, metadata, created_at) values
  ('ac000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'c0000001-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'whatsapp.message', 'Mensagem WhatsApp recebida de Lucas Menezes (DataCore Sistemas SaaS)', '{"channel":"WhatsApp 01"}', now() - interval '4 minutes'),
  ('ac000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'c0000007-0000-4000-8000-000000000007', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'deal.viewed', 'Proposta Comercial visualizada (2ª vez) por Mariana Prado', '{"duration":"4m12s"}', now() - interval '18 minutes'),
  ('ac000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', null, null, 'ai.qualified', 'IA Nexus qualificou Lead: Score 92/100 para BioTech Solutions', '{"score":92,"source":"inbound"}', now() - interval '35 minutes'),
  ('ac000004-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'c0000011-0000-4000-8000-000000000011', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'contract.signed', 'Contrato Digital assinado pela diretoria da LogiCargo Express', '{"value":34000}', now() - interval '60 minutes'),
  ('ac000005-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'c0000006-0000-4000-8000-000000000006', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'deal.updated', 'Oportunidade Fintech Vanguard movida para Qualificado', '{"stage":"qualified"}', now() - interval '140 minutes'),
  ('ac000006-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'c0000003-0000-4000-8000-000000000003', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'task.completed', 'Onboarding Nexus Health concluído', '{}', now() - interval '220 minutes'),
  ('ac000007-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'c0000005-0000-4000-8000-000000000005', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'task.created', 'Tarefa de follow-up criada automaticamente para AgroTech', '{"automation":"inactive_48h"}', now() - interval '300 minutes')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Automações (execução síncrona na API — sem filas)
-- ---------------------------------------------------------------------------

insert into public.automations
  (id, organization_id, name, description, trigger_type, conditions, actions, is_active, created_at, updated_at)
values
  ('a1000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Novo lead (Meta/Site) → Cadastrar & Score IA', 'Webhook Meta Ads → WhatsApp Boas-vindas → Enriquecimento', 'customer.created', '{"source":["meta_ads","website"]}', '[{"type":"create_lead"},{"type":"score_lead"},{"type":"send_whatsapp"}]', true, now() - interval '60 days', now()),
  ('a1000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Cliente inativo há 48h → Follow-up personalizado', 'Gatilho WhatsApp inativo → Notificação + Rascunho IA pronto', 'conversation.inactive', '{"hours":48}', '[{"type":"create_task"},{"type":"draft_ai_followup"}]', true, now() - interval '55 days', now()),
  ('a1000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Lead qualificado no chat → Mover para ''Qualificado''', 'Análise de BANT automática via WhatsApp IA', 'lead.qualified', '{"min_score":75}', '[{"type":"move_deal"},{"type":"notify_owner"}]', true, now() - interval '50 days', now()),
  ('a1000004-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Mensagem WhatsApp → Analisar intenção de compra', 'Classificação em tempo real (Dúvida, Preço, Fechamento)', 'message.received', '{}', '[{"type":"classify_intent"},{"type":"update_conversation"}]', true, now() - interval '45 days', now()),
  ('a1000005-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Venda ''Ganha'' → Notificar CS e Iniciar Onboarding', 'Criação de pasta no Drive + Boas-vindas com link de agendamento', 'deal.won', '{}', '[{"type":"create_task"},{"type":"send_whatsapp"},{"type":"notify_team"}]', true, now() - interval '40 days', now()),
  ('a1000006-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'Risco de Churn → Alerta Diretor Comercial', 'Detecta tom de insatisfação em chamados de suporte', 'customer.churn_risk', '{"sensitivity":"high"}', '[{"type":"alert_manager"}]', false, now() - interval '30 days', now())
on conflict (id) do nothing;

insert into public.automation_runs (id, organization_id, automation_id, status, detail, created_at) values
  ('a2000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'a1000002-0000-4000-8000-000000000002', 'success', 'Tarefa de follow-up criada automaticamente para AgroTech', now() - interval '5 hours')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Interações de IA (auditoria)
-- ---------------------------------------------------------------------------

insert into public.ai_interactions
  (id, organization_id, conversation_id, agent_type, input, output, model, tokens_used, created_at)
values
  ('a3000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'support', 'Resuma a conversa com Lucas Menezes', 'Lucas validou SLA e pediu dados bancários para faturamento via holding.', 'nexus-copilot', 412, now() - interval '3 minutes'),
  ('a3000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'sales', 'Qualifique o lead Beto Castro com BANT', 'Budget não confirmado; Authority: gestor de logística; Need: API e prazo; Timeline: 30 dias. Score 78.', 'nexus-copilot', 356, now() - interval '100 minutes'),
  ('a3000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', null, 'analyst', 'Quais oportunidades estão paradas há mais de 48h?', '9 oportunidades sem atualização há mais de 48h; priorize AgroTech e VFlow.', 'nexus-copilot', 298, now() - interval '25 minutes')
on conflict (id) do nothing;

commit;
