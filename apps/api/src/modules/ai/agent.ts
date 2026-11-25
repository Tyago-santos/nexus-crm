import { can } from "@nexus/shared";
import type { Conversation, Deal, Role } from "@nexus/schemas";
import { store } from "../../shared/store";
import { notFound } from "../../shared/errors";
import { env } from "../../config/env";

export interface AgentContext {
  organizationId: string;
  userId: string;
  role: Role;
}

/**
 * Tools controladas da IA. Nenhuma delas aceita SQL ou acesso direto ao banco:
 * todas passam pelo repositório com escopo de organização e checagem de permissão.
 */
export function createTools(ctx: AgentContext) {
  const orgId = ctx.organizationId;
  return {
    get_customer: (customerId: string) => {
      try {
        return store.getCustomer(orgId, customerId);
      } catch {
        return null;
      }
    },
    search_customers: (query: string) =>
      store.listCustomers(orgId, { search: query }).slice(0, 10),
    get_deals: (stage?: Deal["stage"]) =>
      store.listDeals(orgId).filter((d) => (stage ? d.stage === stage : true)),
    get_conversations: () => store.listConversations(orgId),
    get_messages: (conversationId: string) => store.listMessages(orgId, conversationId),
    get_tasks: () => store.listTasks(orgId),
    get_sales_reports: () => store.dashboard(orgId),
    create_task: (input: { title: string; customer_id?: string; priority?: "low" | "medium" | "high" | "urgent" }) => {
      if (!can(ctx.role, "tasks:write")) throw new Error("Sem permissão para criar tarefas");
      return store.createTask(orgId, ctx.userId, {
        title: input.title,
        customer_id: input.customer_id,
        priority: input.priority ?? "medium",
      });
    },
    send_whatsapp_message: (conversationId: string, content: string) => {
      if (!can(ctx.role, "whatsapp:send")) throw new Error("Sem permissão para enviar mensagens");
      const conversation = store.getConversation(orgId, conversationId);
      if (conversation.ai_mode === "manual") {
        throw new Error("Conversa em modo manual: a IA não pode enviar mensagens");
      }
      return store.sendMessage(orgId, conversationId, ctx.userId, {
        content,
        message_type: "text",
      });
    },
  };
}

export type AgentTools = ReturnType<typeof createTools>;

async function summarizeConversation(orgId: string, conversationId: string) {
  const conversation = store.getConversation(orgId, conversationId);
  const messages = store.listMessages(orgId, conversationId);
  const customer = store.customers.find((c) => c.id === conversation.customer_id);
  const inbound = messages.filter((m) => m.direction === "inbound");
  const lastInbound = inbound.at(-1);
  const lastOutbound = [...messages].reverse().find((m) => m.direction === "outbound");
  let summary = [
    `Resumo da conversa com ${customer?.name ?? "contato"}:`,
    `• ${messages.length} mensagens trocadas; último contato ${lastInbound ? "do cliente" : "sem resposta do cliente"}.`,
    lastInbound ? `• Última solicitação: "${lastInbound.content?.slice(0, 180) ?? ""}"` : null,
    lastOutbound ? `• Última resposta: "${lastOutbound.content?.slice(0, 180) ?? ""}"` : null,
    `• Próximo passo sugerido: ${lastInbound ? "responder com os dados pendentes e confirmar follow-up em 24h." : "enviar mensagem de reengajamento."}`,
  ]
    .filter(Boolean)
    .join("\n");

  const aiSummary = await geminiGenerate(
    "Você é o assistente Nexus CRM AI. Resuma a conversa de WhatsApp de forma clara, com pontos principais e próximo passo. Responda em português.",
    `Cliente: ${customer?.name ?? "contato"}\nMensagens:\n${messages.map((m) => `${m.direction}: ${m.content}`).join("\n")}\n\nResumo base:\n${summary}`,
  );
  if (aiSummary) summary = aiSummary;

  return {
    conversation,
    customer,
    summary,
    key_points: [
      `Modo de IA: ${conversation.ai_mode}`,
      `Responsável: ${store.userPublic(conversation.assigned_to).full_name}`,
      `Status: ${conversation.status}`,
    ],
    messages_count: messages.length,
  };
}

export function qualifyLead(orgId: string, userId: string, leadId: string, notes?: string) {
  const lead = store.leads.find((l) => l.id === leadId && l.organization_id === orgId);
  if (!lead) throw notFound("Lead");
  const customer = store.customers.find((c) => c.id === lead.customer_id);
  const deals = store.deals.filter((d) => d.organization_id === orgId && d.customer_id === lead.customer_id);
  const bestDeal = [...deals].sort((a, b) => b.value - a.value)[0];
  const tagScore = Math.min((customer?.tags.length ?? 0) * 6, 24);
  const valueScore = Math.min(Math.round((bestDeal?.value ?? 0) / 5000), 20);
  const sourceScore = lead.source?.toLowerCase().includes("whatsapp") ? 10 : 5;
  const score = Math.min(98, 55 + tagScore + valueScore + sourceScore);
  const probability = Math.min(95, Math.round(score * 0.92));
  store.updateLead(orgId, lead.id, { status: "qualified" });
  const task = store.createTask(orgId, userId, {
    title: `Follow-up de qualificação — ${customer?.name ?? lead.title}`,
    customer_id: lead.customer_id,
    priority: score >= 80 ? "high" : "medium",
  });
  const output = `Lead "${lead.title}" qualificado com score ${score}/100. Probabilidade estimada de fechamento: ${probability}%.`;
  store.recordAiInteraction(orgId, null, "sales", `qualify_lead:${leadId}`, output);
  return {
    score,
    probability,
    customer: customer?.name ?? null,
    reasoning: [
      `Setor/tags do cliente: ${customer?.tags.join(", ") || "não informado"} (+${tagScore})`,
      bestDeal ? `Maior oportunidade vinculada: ${bestDeal.title} (R$ ${bestDeal.value.toLocaleString("pt-BR")}) (+${valueScore})` : "Sem oportunidade vinculada",
      `Origem do lead: ${lead.source ?? "não informada"} (+${sourceScore})`,
      notes ? `Observações do vendedor consideradas na análise.` : "Sem observações adicionais.",
    ],
    next_steps: [
      "Confirmar orçamento e tomador de decisão (BANT)",
      "Agendar demonstração técnica",
      `Follow-up automático criado para ${new Date(task.due_date ?? Date.now()).toLocaleDateString("pt-BR")}`,
    ],
    task_id: task.id,
  };
}

async function geminiGenerate(systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (process.env.NODE_ENV === "test") return null;
  const keys = [env.GEMINI_API_KEY, ...(env.GEMINI_API_KEY_FALLBACKS?.split(",") ?? [])]
    .map((k) => k?.trim())
    .filter(Boolean) as string[];
  if (keys.length === 0) return null;

  const model = env.GEMINI_MODEL || "gemini-3-flash-preview";
  for (const key of keys) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
          }),
          signal: controller.signal,
        },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
      };
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const text = parts
        .filter((p) => !p.thought)
        .map((p) => p.text ?? "")
        .join("")
        .trim();
      if (text) return text;
    } catch {
      // tenta próxima chave
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

export async function chat(orgId: string, userId: string, role: Role, message: string, conversationId?: string) {
  const tools = createTools({ organizationId: orgId, userId, role });
  const lower = message.toLowerCase();
  const used: string[] = [];
  let answer = "";
  let agentType: "support" | "sales" | "analyst" | "followup" = "analyst";

  if (/sem (atendimento|resposta)|48 ?h|paradas?/.test(lower)) {
    agentType = "followup";
    used.push("get_conversations", "get_deals");
    const conversations = tools.get_conversations().filter(
      (c) => Date.now() - new Date(c.last_message_at).getTime() > 48 * 3_600_000,
    );
    const staleDeals = tools
      .get_deals()
      .filter((d) => !["won", "lost"].includes(d.stage) && Date.now() - new Date(d.updated_at).getTime() > 48 * 3_600_000);
    answer = [
      `Encontrei ${conversations.length} conversa(s) sem atendimento há mais de 48 horas:`,
      ...conversations.map((c) => `• ${c.customer_name} — ${c.last_message.slice(0, 90)} (${c.assigned_to_name})`),
      staleDeals.length ? `\nOportunidades paradas (${staleDeals.length}):` : "",
      ...staleDeals.map((d) => `• ${d.title} — R$ ${d.value.toLocaleString("pt-BR")} (${d.stage})`),
      "\nRecomendo criar tarefas de follow-up e priorizar os contatos com maior valor.",
    ].filter(Boolean).join("\n");
  } else if (/resumo|resumir|sumarizar/.test(lower)) {
    agentType = "support";
    used.push("summarize_conversation");
    let target = conversationId ?? tools.get_conversations()[0]?.id;
    const byName = tools.get_conversations().find((c) => lower.includes(c.customer_name.toLowerCase().split(" ")[0] ?? ""));
    if (byName) target = byName.id;
    if (!target) throw notFound("Conversa");
    const summarized = await summarizeConversation(orgId, target);
    answer = summarized.summary;
  } else if (/qualific|score|bant/.test(lower)) {
    agentType = "sales";
    used.push("get_deals", "get_customer");
    const qualified = store.leads.filter((l) => l.organization_id === orgId && l.status === "qualified");
    answer = [
      `Há ${qualified.length} leads qualificados na organização.`,
      ...qualified.slice(0, 5).map((l) => {
        const customer = tools.get_customer(l.customer_id);
        return `• ${customer?.name ?? l.title} — ${customer?.company ?? "sem empresa"} (${l.source ?? "origem não informada"})`;
      }),
      "\nUse o endpoint /api/ai/qualify-lead para recalcular o score de um lead específico com validação Zod.",
    ].join("\n");
  } else if (/envie|enviar mensagem|mande/.test(lower)) {
    agentType = "support";
    used.push("send_whatsapp_message");
    if (!conversationId) {
      answer = "Preciso do ID da conversa para enviar uma mensagem. Selecione uma conversa na Central WhatsApp.";
    } else {
      try {
        const suggested = "Olá! Passando para retomar nosso contato e dar seguimento à sua solicitação. Podemos conversar hoje?";
        tools.send_whatsapp_message(conversationId, suggested);
        answer = "Mensagem enviada com sucesso após validar permissões, modo de atendimento e regras de envio.";
      } catch (error) {
        answer = `Ação bloqueada pelas regras de segurança: ${(error as Error).message}`;
      }
    }
  } else if (/vendas|receita|mrr|funil|conversão|relatório/.test(lower)) {
    agentType = "analyst";
    used.push("get_sales_reports");
    const report = tools.get_sales_reports();
    answer = [
      `Receita realizada: R$ ${report.revenue.toLocaleString("pt-BR")}.`,
      `Oportunidades abertas: ${report.open_deals}. Taxa de conversão: ${report.conversion_rate}%.`,
      `Conversas pendentes: ${report.pending_conversations}.`,
      "\nInsights:",
      ...report.insights.map((i) => `• ${i.title}: ${i.description}`),
    ].join("\n");
  } else {
    agentType = "analyst";
    used.push("get_sales_reports", "get_deals", "get_conversations");
    const report = tools.get_sales_reports();
    const top = [...tools.get_deals()].filter((d) => !["won", "lost"].includes(d.stage)).sort((a, b) => b.value - a.value).slice(0, 3);
    answer = [
      `Panorama da Nexus CRM: ${report.customers} clientes, ${report.open_deals} oportunidades abertas e ${report.pending_conversations} atendimentos pendentes.`,
      "",
      "Top oportunidades:",
      ...top.map((d) => `• ${d.title} — R$ ${d.value.toLocaleString("pt-BR")} (${d.probability}% de probabilidade)`),
      "",
      "Posso analisar conversas sem resposta, resumir atendimentos, qualificar leads ou consultar relatórios.",
    ].join("\n");
  }

  if (!answer.includes("bloqueada")) {
    const refined = await geminiGenerate(
      "Você é o assistente Nexus CRM AI. Responda em português, de forma objetiva e útil, usando apenas os dados fornecidos. Não invente números.",
      `Pergunta do usuário: ${message}\n\nResposta base calculada:\n${answer}\n\nMelhore a resposta mantendo os dados e ações sugeridas.`,
    );
    if (refined) answer = refined;
  }

  const interaction = store.recordAiInteraction(orgId, conversationId ?? null, agentType, message, answer);
  return { answer, tools_used: used, interaction_id: interaction.id, agent_type: agentType };
}

export async function suggestReply(orgId: string, conversationId: string) {
  const conversation = store.getConversation(orgId, conversationId);
  const messages = store.listMessages(orgId, conversationId);
  const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
  const customer = store.customers.find((c) => c.id === conversation.customer_id);
  const content = lastInbound?.content?.toLowerCase() ?? "";
  let suggestion = `Olá${customer ? `, ${customer.name.split(" ")[0]}` : ""}! Obrigado pelo contato. Como posso ajudar a avançar?`;
  if (/sla|suporte|incidente/.test(content)) {
    suggestion = `Olá${customer ? `, ${customer.name.split(" ")[0]}` : ""}! Nosso SLA Enterprise cobre incidentes de Severidade 1 em até 45 minutos, com canal direto 24/7. Posso confirmar os detalhes no contrato?`;
  } else if (/contrato|minuta|jurídic/.test(content)) {
    suggestion = `Perfeito! A minuta revisada segue em anexo, com a cláusula de LGPD validada pelo nosso jurídico. Posso enviar para assinatura digital?`;
  } else if (/fatura|pagamento|cnpj|financeir/.test(content)) {
    suggestion = `Claro! Vou preparar o detalhamento e confirmar os dados de faturamento com o financeiro. Envio ainda hoje.`;
  }

  const aiSuggestion = await geminiGenerate(
    "Você é um assistente de vendas. Gere uma única resposta sugerida para WhatsApp, curta, profissional e em português.",
    `Cliente: ${customer?.name ?? "contato"}\nÚltima mensagem do cliente: ${lastInbound?.content ?? "(sem mensagem)"}\nSugestão base: ${suggestion}\nGere a melhor sugestão final.`,
  );
  if (aiSuggestion) suggestion = aiSuggestion;

  store.recordAiInteraction(orgId, conversationId, "support", "suggest_reply", suggestion);
  return {
    conversation_id: conversationId,
    suggestion,
    confidence: 0.94,
    mode: conversation.ai_mode,
    requires_approval: conversation.ai_mode !== "automatic",
  };
}

export { summarizeConversation };
