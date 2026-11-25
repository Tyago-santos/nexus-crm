import { store } from "../../shared/store";

function memberContext(orgId: string) {
  const member =
    store.members.find((m) => m.organization_id === orgId && m.role === "owner") ??
    store.members.find((m) => m.organization_id === orgId);
  if (!member) throw new Error("Organização sem membros");
  return member;
}

/** Automação: novo cliente → criar lead e registrar atividade. */
export function runCustomerCreatedAutomation(organizationId: string, customerId: string, name: string) {
  const member = memberContext(organizationId);
  const lead = store.createLead(organizationId, member.user_id, {
    customer_id: customerId,
    title: `Novo lead — ${name}`,
    source: "whatsapp",
  });
  store.logActivity(organizationId, customerId, member.user_id, "automation.lead_created", `Automação criou o lead "${lead.title}"`);
  return { executed: "create_lead" as const, lead_id: lead.id };
}

/** Automação: venda ganha → criar tarefa de onboarding. */
export function runDealWonAutomation(organizationId: string, dealId: string) {
  const member = memberContext(organizationId);
  const deal = store.deals.find((d) => d.id === dealId && d.organization_id === organizationId);
  if (!deal) return { skipped: true as const };
  const task = store.createTask(organizationId, member.user_id, {
    customer_id: deal.customer_id,
    deal_id: deal.id,
    title: `Onboarding — ${deal.title}`,
    description: "Automação de venda ganha: iniciar onboarding e agendar kickoff.",
    priority: "high",
    due_date: new Date(Date.now() + 86_400_000).toISOString(),
  });
  store.logActivity(organizationId, deal.customer_id, member.user_id, "automation.onboarding", `Onboarding criado para ${deal.title}`);
  return { executed: "create_onboarding_task" as const, task_id: task.id };
}

/**
 * Follow-up de conversas sem retorno há 48h. Executado por endpoint de cron
 * (sem fila), pois o Render Free não suporta workers.
 */
export function runFollowupAutomation(organizationId: string) {
  const cutoff = Date.now() - 48 * 3_600_000;
  const stale = store
    .listConversations(organizationId)
    .filter((c) => c.status !== "closed" && new Date(c.last_message_at).getTime() < cutoff);
  const created: string[] = [];
  for (const conversation of stale) {
    const exists = store.tasks.some(
      (t) =>
        t.organization_id === organizationId &&
        t.customer_id === conversation.customer_id &&
        t.status === "pending" &&
        t.title.startsWith("Follow-up automático"),
    );
    if (exists) continue;
    const member = memberContext(organizationId);
    const task = store.createTask(organizationId, member.user_id, {
      customer_id: conversation.customer_id ?? undefined,
      title: "Follow-up automático — conversa sem retorno há 48h",
      description: `Conversa com ${conversation.customer_name} sem resposta desde ${new Date(conversation.last_message_at).toLocaleString("pt-BR")}.`,
      priority: "high",
      due_date: new Date(Date.now() + 3_600_000).toISOString(),
    });
    created.push(task.id);
  }
  return { created_tasks: created.length, task_ids: created };
}
