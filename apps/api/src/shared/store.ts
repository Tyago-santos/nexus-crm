import { randomUUID } from "node:crypto";
import type {
  Activity,
  Automation,
  Conversation,
  Customer,
  Deal,
  Lead,
  Message,
  Task,
  WhatsappAccount,
} from "@nexus/schemas";
import { phoneMatchKey } from "@nexus/shared";
import { conflict, notFound } from "./errors";
import { persistWhatsAppAccount, persistConversation, persistMessage, persistCustomer, deleteCustomer as persistDeleteCustomer, hydrateCustomers } from "./supabase";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  password: string;
  created_at: string;
}

export interface Member {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "manager" | "seller" | "support";
  created_at: string;
}

export interface StoredConversation extends Conversation {
  unread_count: number;
  tags: string[];
}

export interface AiInteraction {
  id: string;
  organization_id: string;
  conversation_id: string | null;
  agent_type: "support" | "sales" | "analyst" | "followup";
  input: string;
  output: string;
  model: string;
  tokens_used: number;
  created_at: string;
}

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

const ORG = {
  tech: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "TechVentures Brasil",
    slug: "techventures-brasil",
    created_at: daysAgo(420),
    updated_at: now(),
  },
  rival: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Organização Concorrente",
    slug: "org-concorrente",
    created_at: daysAgo(120),
    updated_at: now(),
  },
} satisfies Record<string, Organization>;

const USERS = {
  camila: {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    full_name: "Camila Duarte",
    email: "camila@nexus.ai",
    avatar_url: null,
    password: "nexus123",
    created_at: daysAgo(420),
  },
  rafael: {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    full_name: "Rafael Nunes",
    email: "rafael@nexus.ai",
    avatar_url: null,
    password: "nexus123",
    created_at: daysAgo(300),
  },
  marina: {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    full_name: "Marina Duarte",
    email: "marina@nexus.ai",
    avatar_url: null,
    password: "nexus123",
    created_at: daysAgo(260),
  },
  eva: {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    full_name: "Eva Rival",
    email: "eva@rival.ai",
    avatar_url: null,
    password: "nexus123",
    created_at: daysAgo(90),
  },
} satisfies Record<string, User>;

const MEMBERS: Member[] = [
  { id: "e0000001-0000-4000-8000-000000000001", organization_id: ORG.tech.id, user_id: USERS.camila.id, role: "owner", created_at: daysAgo(420) },
  { id: "e0000002-0000-4000-8000-000000000002", organization_id: ORG.tech.id, user_id: USERS.rafael.id, role: "seller", created_at: daysAgo(300) },
  { id: "e0000003-0000-4000-8000-000000000003", organization_id: ORG.tech.id, user_id: USERS.marina.id, role: "manager", created_at: daysAgo(260) },
  { id: "e0000004-0000-4000-8000-000000000004", organization_id: ORG.rival.id, user_id: USERS.eva.id, role: "owner", created_at: daysAgo(90) },
];

function customer(
  n: number,
  data: Omit<Customer, "id" | "organization_id" | "created_by" | "created_at" | "updated_at">,
): Customer {
  return {
    id: `c000000${n}-0000-4000-8000-00000000000${n}`,
    organization_id: ORG.tech.id,
    created_by: USERS.camila.id,
    created_at: daysAgo(n * 9 + 4),
    updated_at: now(),
    ...data,
  };
}

const CUSTOMERS: Customer[] = [
  customer(1, { name: "Lucas Menezes", email: "lucas@datacore.io", phone: "+5511984529901", company: "DataCore Sistemas SaaS", document: "12.345.678/0001-90", address: "Av. Paulista, 1000 - São Paulo, SP", notes: "Head de Inovação & Vendas. Empresa expandindo para 3 novas filiais.", tags: ["Enterprise SaaS", "TomadorDeDecisão", "Tier 1"], assigned_to: USERS.camila.id }),
  customer(2, { name: "Mariana Albuquerque", email: "mariana@vflow.com.br", phone: "+5541991204412", company: "VFlow Logística Global", document: null, address: "Curitiba, PR", notes: "Avaliando integração com ERP.", tags: ["Logística", "Em Negociação"], assigned_to: USERS.rafael.id }),
  customer(3, { name: "Dr. Rodrigo Prado", email: "rodrigo.prado@nexushealth.med", phone: "+5521987221088", company: "Rede Hospitais Nexus Health", document: null, address: "Rio de Janeiro, RJ", notes: "Onboarding em andamento.", tags: ["Healthcare", "Onboarding"], assigned_to: USERS.marina.id }),
  customer(4, { name: "Helena Brandão", email: "helena.brandao@finpeak.com", phone: "+5511971349002", company: "FinPeak Wealth Management", document: null, address: "São Paulo, SP", notes: "Interesse em automação de follow-up.", tags: ["Finanças", "Ativo"], assigned_to: USERS.camila.id }),
  customer(5, { name: "Carlos Eduardo Mendes", email: "mendes@agrotech.ind.br", phone: "+5567996513329", company: "AgroTech Monitoramento", document: null, address: "Campo Grande, MS", notes: "Risco de churn por falta de resposta.", tags: ["Agro", "Churn Risk"], assigned_to: USERS.rafael.id }),
  customer(6, { name: "Juliana Meireles", email: "juliana@fintechvanguard.com", phone: "+5511912345678", company: "Fintech Vanguard", document: null, address: "São Paulo, SP", notes: "Minuta de contrato visualizada 4x.", tags: ["Fintech", "Enterprise"], assigned_to: USERS.camila.id }),
  customer(7, { name: "Mariana Prado", email: "mariana@somasaude.com.br", phone: "+5511998877665", company: "Grupo Soma Saúde", document: null, address: "Belo Horizonte, MG", notes: "120 licenças em avaliação.", tags: ["Healthcare", "PrioridadeAlta"], assigned_to: USERS.rafael.id }),
  customer(8, { name: "Rodrigo Borges", email: "rodrigo@atlaslog.com.br", phone: "+5511997766554", company: "Atlas Logística", document: null, address: "Santos, SP", notes: "Integração API em testes.", tags: ["Logística", "API"], assigned_to: USERS.marina.id }),
  customer(9, { name: "Beatriz Lima", email: "beatriz@nexpay.com", phone: "+5511996655443", company: "NexPay Soluções", document: null, address: "São Paulo, SP", notes: "Plano Scale.", tags: ["Fintech", "Scale"], assigned_to: USERS.rafael.id }),
  customer(10, { name: "Fernanda Lemos", email: "fernanda@solarenergia.com", phone: "+5511995544332", company: "Solaris Energia", document: null, address: "Campinas, SP", notes: "Inbound via landing page.", tags: ["Energia", "Inbound"], assigned_to: USERS.camila.id }),
  customer(11, { name: "Beto Castro", email: "beto@logicargo.com", phone: "+5511994433221", company: "LogiCargo Express", document: null, address: "Guarulhos, SP", notes: "Lead qualificado pelo WhatsApp.", tags: ["Logística", "Qualificado"], assigned_to: USERS.rafael.id }),
  customer(12, { name: "Dr. Henrique Viana", email: "henrique@healthcareplus.com", phone: "+5511993322110", company: "HealthCare Plus", document: null, address: "São Paulo, SP", notes: "Demonstração agendada.", tags: ["Healthcare", "Demo"], assigned_to: USERS.marina.id }),
];

function lead(n: number, customer_id: string, title: string, source: string, status: Lead["status"], assigned_to: string, created_at: string): Lead {
  return {
    id: `f000000${n}-0000-4000-8000-00000000000${n}`,
    organization_id: ORG.tech.id,
    customer_id,
    title,
    source,
    status,
    assigned_to,
    created_at,
    updated_at: created_at,
  };
}

const LEADS: Lead[] = [
  lead(1, CUSTOMERS[0]!.id, "DataCore — Expansão Enterprise", "WhatsApp", "qualified", USERS.camila.id, daysAgo(12)),
  lead(2, CUSTOMERS[1]!.id, "VFlow — Integração ERP", "Indicação", "contacted", USERS.rafael.id, daysAgo(9)),
  lead(3, CUSTOMERS[4]!.id, "AgroTech — Retomada", "Inbound", "new", USERS.rafael.id, daysAgo(2)),
  lead(4, CUSTOMERS[5]!.id, "Fintech Vanguard — Suite Enterprise", "Evento", "qualified", USERS.camila.id, daysAgo(20)),
  lead(5, CUSTOMERS[9]!.id, "Solaris — Automação Comercial", "Landing Page", "new", USERS.camila.id, daysAgo(1)),
  lead(6, CUSTOMERS[10]!.id, "LogiCargo — WhatsApp Bot", "WhatsApp", "qualified", USERS.rafael.id, daysAgo(5)),
  lead(7, CUSTOMERS[6]!.id, "Soma Saúde — 120 Licenças", "Outbound", "contacted", USERS.rafael.id, daysAgo(14)),
  lead(8, CUSTOMERS[2]!.id, "Nexus Health — Onboarding", "Parceria", "converted", USERS.marina.id, daysAgo(40)),
];

function deal(
  n: number,
  customer_id: string,
  title: string,
  value: number,
  stage: Deal["stage"],
  probability: number,
  assigned_to: string,
  expectedInDays: number,
  createdDaysAgo: number,
  lead_id: string | null = null,
): Deal {
  return {
    id: `a000000${n}-0000-4000-8000-00000000000${n}`,
    organization_id: ORG.tech.id,
    customer_id,
    lead_id,
    title,
    value,
    stage,
    probability,
    assigned_to,
    expected_close_date: new Date(Date.now() + expectedInDays * 86_400_000).toISOString().slice(0, 10),
    created_at: daysAgo(createdDaysAgo),
    updated_at: daysAgo(Math.max(0, createdDaysAgo - 2)),
  };
}

const DEALS: Deal[] = [
  deal(1, CUSTOMERS[4]!.id, "AgroTech — Monitoramento Enterprise", 32000, "new_lead", 65, USERS.camila.id, 20, 4, LEADS[2]!.id),
  deal(2, CUSTOMERS[9]!.id, "Solaris — Automação Comercial", 64000, "new_lead", 48, USERS.rafael.id, 30, 2, LEADS[4]!.id),
  deal(3, CUSTOMERS[1]!.id, "VFlow — Integração Omnichannel", 45000, "first_contact", 55, USERS.rafael.id, 25, 8, LEADS[1]!.id),
  deal(4, CUSTOMERS[10]!.id, "LogiCargo — WhatsApp Bot", 33500, "first_contact", 62, USERS.rafael.id, 18, 6, LEADS[5]!.id),
  deal(5, CUSTOMERS[5]!.id, "Fintech Vanguard — Suite Enterprise", 85000, "qualified", 88, USERS.camila.id, 12, 18, LEADS[3]!.id),
  deal(6, CUSTOMERS[11]!.id, "HealthCare Plus — CRM Clínico", 57000, "qualified", 74, USERS.marina.id, 22, 15, null),
  deal(7, CUSTOMERS[0]!.id, "DataCore — Expansão Multi-Filiais", 74400, "proposal_sent", 92, USERS.camila.id, 4, 22, LEADS[0]!.id),
  deal(8, CUSTOMERS[6]!.id, "Grupo Nexus Sul — 120 Licenças", 120600, "proposal_sent", 70, USERS.rafael.id, 9, 17, LEADS[6]!.id),
  deal(9, CUSTOMERS[7]!.id, "Atlas — Integração API", 29500, "negotiation", 81, USERS.marina.id, 7, 12, null),
  deal(10, CUSTOMERS[8]!.id, "NexPay — Plano Scale", 24000, "negotiation", 76, USERS.rafael.id, 10, 11, null),
  deal(11, CUSTOMERS[2]!.id, "Nexus Health — Onboarding", 48000, "won", 100, USERS.marina.id, -5, 40, LEADS[7]!.id),
  deal(12, CUSTOMERS[3]!.id, "FinPeak — Automação de Follow-up", 26500, "lost", 0, USERS.camila.id, -8, 35, null),
  deal(13, CUSTOMERS[0]!.id, "DataCore — Licenças Adicionais", 52000, "won", 100, USERS.camila.id, -2, 42, null),
  deal(14, CUSTOMERS[9]!.id, "Solaris — Módulo IA", 38000, "won", 100, USERS.rafael.id, -3, 30, null),
  deal(15, CUSTOMERS[6]!.id, "Grupo Nexus Sul — Expansão", 46000, "won", 100, USERS.marina.id, -4, 28, null),
];

function task(
  n: number,
  title: string,
  customer_id: string | null,
  deal_id: string | null,
  assigned_to: string,
  status: Task["status"],
  priority: Task["priority"],
  dueInHours: number,
  description = "",
): Task {
  return {
    id: `b000000${n}-0000-4000-8000-00000000000${n}`,
    organization_id: ORG.tech.id,
    customer_id,
    deal_id,
    assigned_to,
    title,
    description,
    status,
    priority,
    due_date: new Date(Date.now() + dueInHours * 3_600_000).toISOString(),
    created_at: daysAgo(n),
    updated_at: now(),
  };
}

const TASKS: Task[] = [
  task(1, "Call de alinhamento", CUSTOMERS[6]!.id, DEALS[7]!.id, USERS.camila.id, "pending", "high", 3, "Google Meet pronto. Revisar proposta antes da call."),
  task(2, "Enviar minuta contratual", CUSTOMERS[5]!.id, DEALS[4]!.id, USERS.camila.id, "pending", "urgent", 5, "Minuta revisada pela IA."),
  task(3, "Revisão semanal do pipeline", null, null, USERS.camila.id, "pending", "medium", 7, "Sala principal com o time comercial."),
  task(4, "Follow-up com AgroTech", CUSTOMERS[4]!.id, DEALS[0]!.id, USERS.rafael.id, "pending", "urgent", 2, "Lead sem resposta há 52 horas."),
  task(5, "Preparar demo técnica", CUSTOMERS[11]!.id, DEALS[5]!.id, USERS.marina.id, "in_progress", "high", 26, "Demonstração do módulo WhatsApp."),
  task(6, "Onboarding Nexus Health", CUSTOMERS[2]!.id, DEALS[10]!.id, USERS.marina.id, "done", "medium", -20, "Kickoff concluído."),
  task(7, "Reengajar FinPeak", CUSTOMERS[3]!.id, DEALS[11]!.id, USERS.camila.id, "cancelled", "low", -48, "Cliente postergou decisão."),
];

const ACCOUNT: WhatsappAccount = {
  id: "90000000-0000-4000-8000-000000000001",
  organization_id: ORG.tech.id,
  phone_number: "",
  provider: "baileys",
  connection_status: "connected",
  session_reference: "session-techventures-01",
  created_at: daysAgo(90),
  updated_at: now(),
};

function conversation(
  n: number,
  customer_id: string | null,
  chat_id: string,
  status: Conversation["status"],
  ai_mode: Conversation["ai_mode"],
  assigned_to: string,
  lastMinutes: number,
  unread: number,
  tags: string[],
): StoredConversation {
  return {
    id: `d000000${n}-0000-4000-8000-00000000000${n}`,
    organization_id: ORG.tech.id,
    whatsapp_account_id: ACCOUNT.id,
    customer_id,
    external_chat_id: chat_id,
    status,
    assigned_to,
    ai_mode,
    last_message_at: minutesAgo(lastMinutes),
    created_at: daysAgo(30 + n),
    updated_at: minutesAgo(lastMinutes),
    unread_count: unread,
    tags,
  };
}

const CONVERSATIONS: StoredConversation[] = [
  conversation(1, CUSTOMERS[0]!.id, "5511984529901@s.whatsapp.net", "open", "copilot", USERS.camila.id, 8, 1, ["Proposta Enviada", "IA Copilot"]),
  conversation(2, CUSTOMERS[8]!.id, "5511996655443@s.whatsapp.net", "pending", "copilot", USERS.rafael.id, 35, 0, ["Pós-venda"]),
  conversation(3, CUSTOMERS[10]!.id, "5511994433221@s.whatsapp.net", "open", "automatic", USERS.rafael.id, 110, 0, ["Qualificado"]),
  conversation(4, CUSTOMERS[1]!.id, "5541991204412@s.whatsapp.net", "pending", "manual", USERS.rafael.id, 260, 2, ["Negociação"]),
  conversation(5, CUSTOMERS[10]!.id, "5511994433222@s.whatsapp.net", "open", "automatic", USERS.marina.id, 410, 0, ["Agendamento"]),
  conversation(6, CUSTOMERS[11]!.id, "5511993322110@s.whatsapp.net", "open", "copilot", USERS.marina.id, 620, 1, ["Demo"]),
  conversation(7, CUSTOMERS[3]!.id, "5511971349002@s.whatsapp.net", "archived", "manual", USERS.camila.id, 2800, 0, ["Financeiro"]),
];

function msg(
  n: number,
  conversation_id: string,
  direction: Message["direction"],
  content: string,
  sender: string,
  recipient: string,
  minutes: number,
  status: Message["status"] = "read",
): Message {
  return {
    id: `ab00000${n}-0000-4000-8000-00000000000${n}`,
    organization_id: ORG.tech.id,
    conversation_id,
    external_message_id: `wamid.demo.${n}`,
    sender,
    recipient,
    direction,
    message_type: "text",
    content,
    media_url: null,
    status,
    created_at: minutesAgo(minutes),
  };
}

const MESSAGES: Message[] = [
  msg(1, CONVERSATIONS[0]!.id, "inbound", "Olá Camila! Estava revendo a minuta do contrato com nosso Diretor de TI. Ele levantou uma dúvida importante sobre o suporte: o plano Enterprise realmente cobre SLA de 1 hora para incidentes críticos em finais de semana?", "Lucas Menezes", ACCOUNT.phone_number, 38),
  msg(2, CONVERSATIONS[0]!.id, "outbound", "Com certeza, Lucas! Nosso SLA para incidentes de Severidade 1 é garantido em contrato em até 45 minutos com canal direto via WhatsApp e pager dedicado 24/7.", "Camila Duarte", "+5511984529901", 34),
  msg(3, CONVERSATIONS[0]!.id, "outbound", "Segue também a versão final do contrato para assinatura digital: Nexus_SLA_Enterprise_2025.pdf", "Camila Duarte", "+5511984529901", 33),
  msg(4, CONVERSATIONS[0]!.id, "inbound", "Perfeito! Conseguem faturar com o CNPJ da nossa holding controladora? Me indica os dados bancários para eu validar com o financeiro.", "Lucas Menezes", ACCOUNT.phone_number, 8),
  msg(5, CONVERSATIONS[1]!.id, "inbound", "Oi Rafael, tudo bem? Podemos revisar a fatura da renovação? Preciso do detalhamento dos usuários ativos.", "Beatriz Lima", ACCOUNT.phone_number, 42),
  msg(6, CONVERSATIONS[1]!.id, "outbound", "Claro, Beatriz! Vou preparar o detalhamento e te envio ainda hoje.", "Rafael Nunes", "+5511996655443", 35),
  msg(7, CONVERSATIONS[2]!.id, "inbound", "Olá! Quero entender o prazo de integração com nosso sistema de logística. Vocês têm API?", "Beto Castro", ACCOUNT.phone_number, 140),
  msg(8, CONVERSATIONS[2]!.id, "outbound", "Olá Beto! Sim, temos API REST e webhooks. A integração padrão leva de 5 a 7 dias úteis. Posso agendar uma demo técnica?", "Nexus IA", "+5511994433221", 110),
  msg(9, CONVERSATIONS[3]!.id, "inbound", "Vocês conseguem incluir cláusula de LGPD no contrato?", "Mariana Albuquerque", ACCOUNT.phone_number, 300),
  msg(10, CONVERSATIONS[3]!.id, "inbound", "E qual seria o prazo para go-live?", "Mariana Albuquerque", ACCOUNT.phone_number, 260),
  msg(11, CONVERSATIONS[5]!.id, "inbound", "Confirmado para amanhã às 14h. Pode enviar o link?", "Dr. Henrique Viana", ACCOUNT.phone_number, 660),
  msg(12, CONVERSATIONS[5]!.id, "outbound", "Perfeito, Dr. Henrique! Segue o link da demonstração. Até amanhã!", "Marina Duarte", "+5511993322110", 620),
];

const AUTOMATIONS: Automation[] = [
  { id: "a1000001-0000-4000-8000-000000000001", organization_id: ORG.tech.id, name: "Novo lead (Meta/Site) → Cadastrar & Score IA", description: "Webhook Meta Ads → WhatsApp Boas-vindas → Enriquecimento", trigger_type: "customer.created", conditions: { source: ["meta_ads", "website"] }, actions: [{ type: "create_lead" }, { type: "score_lead" }, { type: "send_whatsapp" }], is_active: true, created_at: daysAgo(60), updated_at: now() },
  { id: "a1000002-0000-4000-8000-000000000002", organization_id: ORG.tech.id, name: "Cliente inativo há 48h → Follow-up personalizado", description: "Gatilho WhatsApp inativo → Notificação + Rascunho IA pronto", trigger_type: "conversation.inactive", conditions: { hours: 48 }, actions: [{ type: "create_task" }, { type: "draft_ai_followup" }], is_active: true, created_at: daysAgo(55), updated_at: now() },
  { id: "a1000003-0000-4000-8000-000000000003", organization_id: ORG.tech.id, name: "Lead qualificado no chat → Mover para 'Qualificado'", description: "Análise de BANT automática via WhatsApp IA", trigger_type: "lead.qualified", conditions: { min_score: 75 }, actions: [{ type: "move_deal" }, { type: "notify_owner" }], is_active: true, created_at: daysAgo(50), updated_at: now() },
  { id: "a1000004-0000-4000-8000-000000000004", organization_id: ORG.tech.id, name: "Mensagem WhatsApp → Analisar intenção de compra", description: "Classificação em tempo real (Dúvida, Preço, Fechamento)", trigger_type: "message.received", conditions: {}, actions: [{ type: "classify_intent" }, { type: "update_conversation" }], is_active: true, created_at: daysAgo(45), updated_at: now() },
  { id: "a1000005-0000-4000-8000-000000000005", organization_id: ORG.tech.id, name: "Venda 'Ganha' → Notificar CS e Iniciar Onboarding", description: "Criação de pasta no Drive + Boas-vindas com link de agendamento", trigger_type: "deal.won", conditions: {}, actions: [{ type: "create_task" }, { type: "send_whatsapp" }, { type: "notify_team" }], is_active: true, created_at: daysAgo(40), updated_at: now() },
  { id: "a1000006-0000-4000-8000-000000000006", organization_id: ORG.tech.id, name: "Risco de Churn → Alerta Diretor Comercial", description: "Detecta tom de insatisfação em chamados de suporte", trigger_type: "customer.churn_risk", conditions: { sensitivity: "high" }, actions: [{ type: "alert_manager" }], is_active: false, created_at: daysAgo(30), updated_at: now() },
];

const ACTIVITIES: Activity[] = [
  { id: "ac000001-0000-4000-8000-000000000001", organization_id: ORG.tech.id, customer_id: CUSTOMERS[0]!.id, user_id: USERS.camila.id, activity_type: "whatsapp.message", description: "Mensagem WhatsApp recebida de Lucas Menezes (DataCore Sistemas SaaS)", metadata: { channel: "WhatsApp 01" }, created_at: minutesAgo(4) },
  { id: "ac000002-0000-4000-8000-000000000002", organization_id: ORG.tech.id, customer_id: CUSTOMERS[6]!.id, user_id: USERS.rafael.id, activity_type: "deal.viewed", description: "Proposta Comercial visualizada (2ª vez) por Mariana Prado", metadata: { duration: "4m12s" }, created_at: minutesAgo(18) },
  { id: "ac000003-0000-4000-8000-000000000003", organization_id: ORG.tech.id, customer_id: null, user_id: null, activity_type: "ai.qualified", description: "IA Nexus qualificou Lead: Score 92/100 para BioTech Solutions", metadata: { score: 92, source: "inbound" }, created_at: minutesAgo(35) },
  { id: "ac000004-0000-4000-8000-000000000004", organization_id: ORG.tech.id, customer_id: CUSTOMERS[10]!.id, user_id: USERS.rafael.id, activity_type: "contract.signed", description: "Contrato Digital assinado pela diretoria da LogExpress Brasil", metadata: { value: 34000 }, created_at: minutesAgo(60) },
  { id: "ac000005-0000-4000-8000-000000000005", organization_id: ORG.tech.id, customer_id: CUSTOMERS[5]!.id, user_id: USERS.camila.id, activity_type: "deal.updated", description: "Oportunidade Fintech Vanguard movida para Qualificado", metadata: { stage: "qualified" }, created_at: minutesAgo(140) },
  { id: "ac000006-0000-4000-8000-000000000006", organization_id: ORG.tech.id, customer_id: CUSTOMERS[2]!.id, user_id: USERS.marina.id, activity_type: "task.completed", description: "Onboarding Nexus Health concluído", metadata: {}, created_at: minutesAgo(220) },
  { id: "ac000007-0000-4000-8000-000000000007", organization_id: ORG.tech.id, customer_id: CUSTOMERS[4]!.id, user_id: USERS.rafael.id, activity_type: "task.created", description: "Tarefa de follow-up criada automaticamente para AgroTech", metadata: { automation: "inactive_48h" }, created_at: minutesAgo(300) },
];

export class MemoryStore {
  organizations = [ORG.tech, ORG.rival] as Organization[];
  users = Object.values(USERS) as User[];
  members = [...MEMBERS] as Member[];
  customers = [...CUSTOMERS] as Customer[];
  leads = [...LEADS] as Lead[];
  deals = [...DEALS] as Deal[];
  tasks = [...TASKS] as Task[];
  accounts = [ACCOUNT] as WhatsappAccount[];
  conversations = [...CONVERSATIONS] as StoredConversation[];
  messages = [...MESSAGES] as Message[];
  automations = [...AUTOMATIONS] as Automation[];
  activities = [...ACTIVITIES] as Activity[];
  aiInteractions: AiInteraction[] = [];
  pendingQr = new Map<string, string>();

  private userById(id: string | null | undefined) {
    return this.users.find((u) => u.id === id) ?? null;
  }

  userPublic(id: string | null | undefined) {
    const user = this.userById(id);
    if (!user) return { id: null, full_name: "Não atribuído", email: "", avatar_url: null };
    return { id: user.id, full_name: user.full_name, email: user.email, avatar_url: user.avatar_url };
  }

  memberFor(userId: string, organizationId: string) {
    return this.members.find((m) => m.user_id === userId && m.organization_id === organizationId) ?? null;
  }

  orgBySlug(slug: string) {
    return this.organizations.find((o) => o.slug === slug) ?? null;
  }

  findUserByEmail(email: string) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  membersOf(organizationId: string) {
    return this.members
      .filter((m) => m.organization_id === organizationId)
      .map((m) => ({ ...m, user: this.userPublic(m.user_id) }));
  }

  createOrganization(input: { name: string; slug: string; owner: Omit<User, "id" | "created_at"> }) {
    const organization: Organization = {
      id: randomUUID(),
      name: input.name,
      slug: input.slug,
      created_at: now(),
      updated_at: now(),
    };
    const user: User = { ...input.owner, id: randomUUID(), created_at: now() };
    const member: Member = {
      id: randomUUID(),
      organization_id: organization.id,
      user_id: user.id,
      role: "owner",
      created_at: now(),
    };
    this.organizations.push(organization);
    this.users.push(user);
    this.members.push(member);
    return { organization, user, member };
  }

  listCustomers(orgId: string, filters: { search?: string; tag?: string; assigned_to?: string } = {}) {
    const term = filters.search?.toLowerCase().trim();
    return this.customers
      .filter((c) => c.organization_id === orgId)
      .filter((c) => (filters.tag ? c.tags.includes(filters.tag) : true))
      .filter((c) => (filters.assigned_to ? c.assigned_to === filters.assigned_to : true))
      .filter((c) =>
        term
          ? [c.name, c.email ?? "", c.company ?? "", c.phone, c.document ?? ""].some((v) =>
              v.toLowerCase().includes(term),
            )
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ ...c, assigned_to_user: this.userPublic(c.assigned_to) }));
  }

  getCustomer(orgId: string, id: string) {
    const found = this.customers.find((c) => c.id === id && c.organization_id === orgId);
    if (!found) throw notFound("Cliente");
    return {
      ...found,
      assigned_to_user: this.userPublic(found.assigned_to),
      deals: this.deals.filter((d) => d.organization_id === orgId && d.customer_id === id),
      conversations: this.conversations.filter((c) => c.organization_id === orgId && c.customer_id === id),
      tasks: this.tasks.filter((t) => t.organization_id === orgId && t.customer_id === id),
      activities: this.activities.filter((a) => a.organization_id === orgId && a.customer_id === id),
    };
  }

  createCustomer(orgId: string, userId: string, input: Partial<Customer> & { name: string; phone?: string }) {
    const phone = input.phone ?? "";
    if (phone) {
      const key = phoneMatchKey(phone);
      const duplicate = this.customers.find(
        (c) => c.organization_id === orgId && phoneMatchKey(c.phone) === key,
      );
      if (duplicate) throw conflict("Já existe um cliente com este telefone nesta organização", { customer_id: duplicate.id });
    }
    const customer: Customer = {
      id: randomUUID(),
      organization_id: orgId,
      name: input.name,
      email: input.email ?? null,
      phone,
      company: input.company ?? null,
      document: input.document ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
      tags: input.tags ?? [],
      assigned_to: input.assigned_to ?? userId,
      created_by: userId,
      created_at: now(),
      updated_at: now(),
    };
    this.customers.push(customer);
    this.logActivity(orgId, customer.id, userId, "customer.created", `Cliente ${customer.name} cadastrado`);
    void persistCustomer(customer);
    return customer;
  }

  updateCustomer(orgId: string, id: string, input: Partial<Customer>) {
    const customer = this.customers.find((c) => c.id === id && c.organization_id === orgId);
    if (!customer) throw notFound("Cliente");
    if (input.phone) {
      const key = phoneMatchKey(input.phone);
      const duplicate = this.customers.find(
        (c) => c.organization_id === orgId && c.id !== id && phoneMatchKey(c.phone) === key,
      );
      if (duplicate) throw conflict("Já existe um cliente com este telefone nesta organização");
    }
    Object.assign(customer, input, { id: customer.id, organization_id: customer.organization_id, updated_at: now() });
    void persistCustomer(customer);
    return customer;
  }

  deleteCustomer(orgId: string, id: string) {
    const index = this.customers.findIndex((c) => c.id === id && c.organization_id === orgId);
    if (index < 0) throw notFound("Cliente");
    this.customers.splice(index, 1);
    void persistDeleteCustomer(id);
  }

  listLeads(orgId: string) {
    return this.leads
      .filter((l) => l.organization_id === orgId)
      .map((l) => ({
        ...l,
        customer: this.customers.find((c) => c.id === l.customer_id && c.organization_id === orgId) ?? null,
        assigned_to_user: this.userPublic(l.assigned_to),
      }));
  }

  createLead(orgId: string, userId: string, input: { customer_id: string; title: string; source?: string; assigned_to?: string }) {
    const customer = this.customers.find((c) => c.id === input.customer_id && c.organization_id === orgId);
    if (!customer) throw notFound("Cliente");
    const lead: Lead = {
      id: randomUUID(),
      organization_id: orgId,
      customer_id: input.customer_id,
      title: input.title,
      source: input.source ?? null,
      status: "new",
      assigned_to: input.assigned_to ?? userId,
      created_at: now(),
      updated_at: now(),
    };
    this.leads.push(lead);
    this.logActivity(orgId, lead.customer_id, userId, "lead.created", `Lead "${lead.title}" criado`);
    return lead;
  }

  updateLead(orgId: string, id: string, input: Partial<Lead>) {
    const lead = this.leads.find((l) => l.id === id && l.organization_id === orgId);
    if (!lead) throw notFound("Lead");
    Object.assign(lead, input, { id: lead.id, organization_id: lead.organization_id, updated_at: now() });
    return lead;
  }

  listDeals(orgId: string) {
    return this.deals
      .filter((d) => d.organization_id === orgId)
      .map((d) => ({
        ...d,
        customer: this.customers.find((c) => c.id === d.customer_id) ?? null,
        assigned_to_user: this.userPublic(d.assigned_to),
      }));
  }

  createDeal(orgId: string, userId: string, input: Partial<Deal> & { customer_id: string; title: string; value: number }) {
    const customer = this.customers.find((c) => c.id === input.customer_id && c.organization_id === orgId);
    if (!customer) throw notFound("Cliente");
    const deal: Deal = {
      id: randomUUID(),
      organization_id: orgId,
      customer_id: input.customer_id,
      lead_id: input.lead_id ?? null,
      title: input.title,
      value: input.value,
      stage: input.stage ?? "new_lead",
      probability: input.probability ?? 20,
      assigned_to: input.assigned_to ?? userId,
      expected_close_date: input.expected_close_date ?? null,
      created_at: now(),
      updated_at: now(),
    };
    this.deals.push(deal);
    this.logActivity(orgId, deal.customer_id, userId, "deal.created", `Oportunidade "${deal.title}" criada`);
    return deal;
  }

  updateDeal(orgId: string, id: string, userId: string, input: Partial<Deal>) {
    const deal = this.deals.find((d) => d.id === id && d.organization_id === orgId);
    if (!deal) throw notFound("Oportunidade");
    const previousStage = deal.stage;
    Object.assign(deal, input, { id: deal.id, organization_id: deal.organization_id, updated_at: now() });
    if (input.stage && input.stage !== previousStage) {
      this.logActivity(orgId, deal.customer_id, userId, "deal.stage_changed", `Oportunidade "${deal.title}" movida de ${previousStage} para ${deal.stage}`, { from: previousStage, to: deal.stage });
    }
    return deal;
  }

  listTasks(orgId: string, filters: { status?: string; assigned_to?: string } = {}) {
    return this.tasks
      .filter((t) => t.organization_id === orgId)
      .filter((t) => (filters.status ? t.status === filters.status : true))
      .filter((t) => (filters.assigned_to ? t.assigned_to === filters.assigned_to : true))
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
      .map((t) => ({
        ...t,
        customer: this.customers.find((c) => c.id === t.customer_id) ?? null,
        assigned_to_user: this.userPublic(t.assigned_to),
      }));
  }

  createTask(orgId: string, userId: string, input: Partial<Task> & { title: string }) {
    const task: Task = {
      id: randomUUID(),
      organization_id: orgId,
      customer_id: input.customer_id ?? null,
      deal_id: input.deal_id ?? null,
      assigned_to: input.assigned_to ?? userId,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "pending",
      priority: input.priority ?? "medium",
      due_date: input.due_date ?? null,
      created_at: now(),
      updated_at: now(),
    };
    this.tasks.push(task);
    this.logActivity(orgId, task.customer_id, userId, "task.created", `Tarefa "${task.title}" criada`);
    return task;
  }

  updateTask(orgId: string, id: string, input: Partial<Task>) {
    const task = this.tasks.find((t) => t.id === id && t.organization_id === orgId);
    if (!task) throw notFound("Tarefa");
    Object.assign(task, input, { id: task.id, organization_id: task.organization_id, updated_at: now() });
    return task;
  }

  listAccounts(orgId: string) {
    return this.accounts.filter((a) => a.organization_id === orgId);
  }

  connectAccount(orgId: string, options: { demoQr?: boolean } = { demoQr: true }) {
    let account = this.accounts.find((a) => a.organization_id === orgId);
    if (!account) {
      account = {
        id: randomUUID(),
        organization_id: orgId,
        phone_number: "",
        provider: "baileys",
        connection_status: "connecting",
        session_reference: `session-${orgId.slice(0, 8)}`,
        created_at: now(),
        updated_at: now(),
      };
      this.accounts.push(account);
      void persistWhatsAppAccount(account);
    }
    account.connection_status = "connecting";
    account.updated_at = now();
    if (options.demoQr === false) {
      this.pendingQr.delete(account.id);
      void persistWhatsAppAccount(account);
      return { account, qr: null as string | null };
    }
    // QR de demonstração: permite validar o fluxo visual sem um socket Baileys.
    // Em produção local/VPS o provider Baileys substitui este valor pelo QR real.
    const qr = `nexus://pair/${account.id}/${randomUUID()}`;
    this.pendingQr.set(account.id, qr);
    void persistWhatsAppAccount(account);
    return { account, qr: qr as string | null };
  }

  getQr(orgId: string, accountId: string) {
    const account = this.accounts.find((a) => a.id === accountId && a.organization_id === orgId);
    if (!account) throw notFound("Conta WhatsApp");
    const qr = this.pendingQr.get(accountId);
    if (!qr) throw conflict("Nenhum QR Code pendente. Inicie uma nova conexão.");
    return { qr, expires_at: new Date(Date.now() + 60_000).toISOString() };
  }

  confirmConnection(orgId: string, accountId: string) {
    const account = this.accounts.find((a) => a.id === accountId && a.organization_id === orgId);
    if (!account) throw notFound("Conta WhatsApp");
    account.connection_status = "connected";
    account.updated_at = now();
    this.pendingQr.delete(accountId);
    void persistWhatsAppAccount(account);
    return account;
  }

  disconnectAccount(orgId: string, accountId: string) {
    const account = this.accounts.find((a) => a.id === accountId && a.organization_id === orgId);
    if (!account) throw notFound("Conta WhatsApp");
    account.connection_status = "disconnected";
    account.updated_at = now();
    this.pendingQr.delete(accountId);
    void persistWhatsAppAccount(account);
    return account;
  }

  listConversations(orgId: string, filters: { search?: string; status?: string } = {}) {
    const term = filters.search?.toLowerCase().trim();
    return this.conversations
      .filter((c) => c.organization_id === orgId)
      .filter((c) => (filters.status ? c.status === filters.status : true))
      .map((c) => {
        const customer = this.customers.find((cu) => cu.id === c.customer_id) ?? null;
        const last = [...this.messages].filter((m) => m.conversation_id === c.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        return {
          ...c,
          customer_name: customer?.name ?? "Contato WhatsApp",
          customer_phone: customer?.phone ?? `+${c.external_chat_id.split("@")[0]}`,
          customer_company: customer?.company ?? null,
          avatar_initials: (customer?.name ?? "WA").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(),
          last_message: last?.content ?? "",
          last_message_at: last?.created_at ?? c.last_message_at,
          assigned_to_name: this.userPublic(c.assigned_to).full_name,
          ai_mode_label: c.ai_mode,
          tags: c.tags,
        };
      })
      .filter((c) =>
        term ? [c.customer_name, c.customer_company ?? "", c.last_message].some((v) => v.toLowerCase().includes(term)) : true,
      )
      .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
  }

  getConversation(orgId: string, id: string) {
    const conversation = this.conversations.find((c) => c.id === id && c.organization_id === orgId);
    if (!conversation) throw notFound("Conversa");
    return conversation;
  }

  listMessages(orgId: string, conversationId: string) {
    this.getConversation(orgId, conversationId);
    return this.messages
      .filter((m) => m.conversation_id === conversationId && m.organization_id === orgId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  sendMessage(
    orgId: string,
    conversationId: string,
    userId: string,
    input: { content?: string; message_type: Message["message_type"]; media_url?: string; client_message_id?: string },
  ) {
    const conversation = this.getConversation(orgId, conversationId);
    const externalId = input.client_message_id ?? `local.${randomUUID()}`;
    const duplicate = this.messages.find(
      (m) => m.organization_id === orgId && m.external_message_id === externalId,
    );
    if (duplicate) return duplicate;
    const customer = this.customers.find((c) => c.id === conversation.customer_id) ?? null;
    const message: Message = {
      id: randomUUID(),
      organization_id: orgId,
      conversation_id: conversationId,
      external_message_id: externalId,
      sender: this.userPublic(userId).full_name,
      recipient: customer?.phone ?? conversation.external_chat_id,
      direction: "outbound",
      message_type: input.message_type,
      content: input.content ?? null,
      media_url: input.media_url ?? null,
      status: "sent",
      created_at: now(),
    };
    this.messages.push(message);
    void persistMessage(message);
    conversation.last_message_at = message.created_at;
    conversation.updated_at = message.created_at;
    return message;
  }

  ingestIncomingMessage(
    orgId: string,
    input: {
      externalChatId: string;
      externalMessageId: string;
      sender: string;
      content: string | null;
      messageType: Message["message_type"];
      createdAt: string;
      customerName?: string;
      accountId?: string;
      isHistory?: boolean;
    },
  ) {
    const duplicate = this.messages.find(
      (m) => m.organization_id === orgId && m.external_message_id === input.externalMessageId,
    );
    if (duplicate) {
      return { duplicate: true as const, message: duplicate, conversation: this.getConversation(orgId, duplicate.conversation_id) };
    }

    const owner = this.members.find((m) => m.organization_id === orgId && m.role === "owner") ?? this.members.find((m) => m.organization_id === orgId);
    if (!owner) throw notFound("Organização");
    const isGroup = input.externalChatId.endsWith("@g.us");
    const phone = isGroup ? "" : `+${input.externalChatId.split("@")[0]}`;
    let customer = isGroup
      ? this.customers.find((c) => c.organization_id === orgId && c.name === (input.customerName ?? "Grupo"))
      : this.customers.find((c) => c.organization_id === orgId && phoneMatchKey(c.phone) === phoneMatchKey(phone));
    if (!customer) {
      customer = this.createCustomer(orgId, owner.user_id, {
        name: input.customerName ?? (isGroup ? "Grupo" : phone),
        phone,
        tags: isGroup ? ["WhatsApp", "Grupo"] : ["WhatsApp"],
        notes: isGroup ? "Grupo do WhatsApp sincronizado automaticamente." : "Cliente criado automaticamente a partir de mensagem recebida no WhatsApp.",
      });
    }

    let account = this.accounts.find((a) => a.organization_id === orgId);
    if (!account) {
      account = {
        id: randomUUID(),
        organization_id: orgId,
        phone_number: "",
        provider: "baileys",
        connection_status: "connected",
        session_reference: null,
        created_at: now(),
        updated_at: now(),
      };
      this.accounts.push(account);
    }

    let conversation = this.conversations.find(
      (c) => c.organization_id === orgId && c.external_chat_id === input.externalChatId,
    );
    if (!conversation) {
      conversation = {
        id: randomUUID(),
        organization_id: orgId,
        whatsapp_account_id: input.accountId ?? account.id,
        customer_id: customer.id,
        external_chat_id: input.externalChatId,
        status: "open",
        assigned_to: owner.user_id,
        ai_mode: "copilot",
        last_message_at: input.createdAt,
        created_at: now(),
        updated_at: now(),
        unread_count: 0,
        tags: ["WhatsApp"],
      };
      this.conversations.push(conversation);
      void persistConversation(conversation as any);
    }

    const message: Message = {
      id: randomUUID(),
      organization_id: orgId,
      conversation_id: conversation.id,
      external_message_id: input.externalMessageId,
      sender: input.customerName ?? input.sender,
      recipient: account.phone_number,
      direction: "inbound",
      message_type: input.messageType,
      content: input.content,
      media_url: null,
      status: "delivered",
      created_at: input.createdAt || now(),
    };
    this.messages.push(message);
    void persistMessage(message);
    if (!conversation.last_message_at || new Date(message.created_at) > new Date(conversation.last_message_at)) {
      conversation.last_message_at = message.created_at;
    }
    conversation.updated_at = message.created_at;
    conversation.status = "open";
    if (!input.isHistory) conversation.unread_count += 1;
    void persistConversation(conversation as any);
    return { duplicate: false as const, message, conversation };
  }

  markConversationRead(orgId: string, id: string) {
    const conversation = this.getConversation(orgId, id);
    conversation.unread_count = 0;
    return conversation;
  }

  setConversationAiMode(orgId: string, id: string, aiMode: Conversation["ai_mode"]) {
    const conversation = this.getConversation(orgId, id);
    conversation.ai_mode = aiMode;
    conversation.updated_at = now();
    return conversation;
  }

  transferConversation(orgId: string, id: string, assignedTo: string) {
    const conversation = this.getConversation(orgId, id);
    const member = this.memberFor(assignedTo, orgId);
    if (!member) throw notFound("Membro da equipe");
    conversation.assigned_to = assignedTo;
    conversation.updated_at = now();
    return conversation;
  }

  logActivity(orgId: string, customerId: string | null, userId: string | null, type: string, description: string, metadata: Record<string, unknown> | null = null) {
    const activity: Activity = {
      id: randomUUID(),
      organization_id: orgId,
      customer_id: customerId,
      user_id: userId,
      activity_type: type,
      description,
      metadata,
      created_at: now(),
    };
    this.activities.unshift(activity);
    return activity;
  }

  listActivities(orgId: string, limit = 20) {
    return this.activities
      .filter((a) => a.organization_id === orgId)
      .slice(0, limit)
      .map((a) => ({ ...a, user: this.userPublic(a.user_id) }));
  }

  listAutomations(orgId: string) {
    return this.automations.filter((a) => a.organization_id === orgId);
  }

  toggleAutomation(orgId: string, id: string, isActive: boolean) {
    const automation = this.automations.find((a) => a.id === id && a.organization_id === orgId);
    if (!automation) throw notFound("Automação");
    automation.is_active = isActive;
    automation.updated_at = now();
    return automation;
  }

  recordAiInteraction(orgId: string, conversationId: string | null, agentType: AiInteraction["agent_type"], input: string, output: string) {
    const interaction: AiInteraction = {
      id: randomUUID(),
      organization_id: orgId,
      conversation_id: conversationId,
      agent_type: agentType,
      input,
      output,
      model: "nexus-reasoner-demo",
      tokens_used: Math.ceil((input.length + output.length) / 4),
      created_at: now(),
    };
    this.aiInteractions.unshift(interaction);
    return interaction;
  }

  dashboard(orgId: string) {
    const customers = this.customers.filter((c) => c.organization_id === orgId);
    const leads = this.leads.filter((l) => l.organization_id === orgId);
    const deals = this.deals.filter((d) => d.organization_id === orgId);
    const conversations = this.conversations.filter((c) => c.organization_id === orgId);
    const openDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
    const wonDeals = deals.filter((d) => d.stage === "won");
    const revenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const pendingConversations = conversations.filter((c) => c.status === "pending" || c.unread_count > 0).length;

    const salesByMonth = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      const month = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const realized = index === 5 ? revenue / 4 : Math.max(28000, revenue / 4 + index * 3200 - 6000);
      return { month, meta: 42500, realizado: Math.round(realized) };
    });

    const funnelOffsets: Record<string, number> = {
      new_lead: 334,
      first_contact: 262,
      qualified: 180,
      proposal_sent: 116,
      negotiation: 85,
      won: 85,
      lost: 40,
    };

    const funnel = (["new_lead", "first_contact", "qualified", "proposal_sent", "negotiation", "won", "lost"] as const).map(
      (stage) => ({
        stage,
        count: deals.filter((d) => d.stage === stage).length + (funnelOffsets[stage] ?? 0),
        value: deals.filter((d) => d.stage === stage).reduce((sum, d) => sum + d.value, 0),
      }),
    );

    const stale = openDeals.filter((d) => Date.now() - new Date(d.updated_at).getTime() > 48 * 3_600_000);
    const insights = [
      stale.length
        ? {
            id: "insight-stale",
            severity: "high",
            title: `${stale.length} oportunidades paradas há mais de 48h`,
            description: `${stale.map((d) => d.title).join(", ")}. Recomendamos follow-up imediato com modelo de reengajamento gerado pela IA.`,
          }
        : {
            id: "insight-stale",
            severity: "low",
            title: "Pipeline em dia",
            description: "Nenhuma oportunidade parada há mais de 48 horas. Bom ritmo comercial.",
          },
      {
        id: "insight-forecast",
        severity: "positive",
        title: "Previsão de fechamento acima da meta",
        description: `A previsão ponderada é de ${wonDeals.length} vendas concluídas e ${openDeals.length} oportunidades ativas, com receita realizada de R$ ${revenue.toLocaleString("pt-BR")}.`,
      },
      {
        id: "insight-whatsapp",
        severity: "ai",
        title: "IA qualificou leads inbound no WhatsApp",
        description: `${leads.filter((l) => l.status === "qualified").length} leads qualificados e ${conversations.filter((c) => c.ai_mode === "automatic").length} conversas em modo automático.`,
      },
    ];

    return {
      customers: customers.length * 119,
      new_leads: leads.filter((l) => l.status === "new").length + 335,
      open_deals: openDeals.length + 34,
      won_deals: wonDeals.length + 82,
      revenue,
      conversion_rate: deals.length ? Math.round((wonDeals.length / deals.length) * 1000) / 10 : 0,
      conversations: conversations.length + 176,
      pending_conversations: pendingConversations,
      sales_by_month: salesByMonth,
      funnel,
      insights,
      activities: this.listActivities(orgId, 6),
      tasks: this.listTasks(orgId).filter((t) => t.status === "pending").slice(0, 4),
    };
  }
}

export const store = new MemoryStore();
