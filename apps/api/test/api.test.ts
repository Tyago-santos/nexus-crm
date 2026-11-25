import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";
import { store } from "../src/shared/store";

let app: FastifyInstance;
let token: string;
let rivalToken: string;
let sellerToken: string;

async function login(email: string, password = "nexus123") {
  const response = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });
  expect(response.statusCode).toBe(200);
  return response.json().data.token as string;
}

function auth(value: string) {
  return { authorization: `Bearer ${value}` };
}

beforeAll(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
  token = await login("camila@nexus.ai");
  rivalToken = await login("eva@rival.ai");
  sellerToken = await login("rafael@nexus.ai");
});

afterAll(async () => {
  await app.close();
});

describe("autenticação e multi-tenancy", () => {
  it("rejeita requisição sem token", async () => {
    const response = await app.inject({ method: "GET", url: "/api/customers" });
    expect(response.statusCode).toBe(401);
  });

  it("lista apenas clientes da própria organização", async () => {
    const own = await app.inject({ method: "GET", url: "/api/customers", headers: auth(token) });
    expect(own.statusCode).toBe(200);
    expect(own.json().data.length).toBeGreaterThan(0);

    const rival = await app.inject({ method: "GET", url: "/api/customers", headers: auth(rivalToken) });
    expect(rival.statusCode).toBe(200);
    expect(rival.json().data).toHaveLength(0);
  });

  it("não permite acesso cruzado a um cliente de outra organização", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/customers/c0000001-0000-4000-8000-000000000001",
      headers: auth(rivalToken),
    });
    expect(response.statusCode).toBe(404);
  });
});

describe("CRM", () => {
  it("cadastra cliente e impede telefone duplicado na organização", async () => {
    const payload = {
      name: "Cliente Teste",
      phone: "(11) 90000-0001",
      email: "teste@nexus.ai",
      tags: ["Teste"],
    };
    const created = await app.inject({ method: "POST", url: "/api/customers", headers: auth(token), payload });
    expect(created.statusCode).toBe(201);
    expect(created.json().data.name).toBe("Cliente Teste");

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/customers",
      headers: auth(token),
      payload: { ...payload, name: "Outro Nome", phone: "+55 11 90000-0001" },
    });
    expect(duplicate.statusCode).toBe(409);
  });

  it("cria lead para cliente existente", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/leads",
      headers: auth(token),
      payload: { customer_id: "c0000001-0000-4000-8000-000000000001", title: "Lead de teste", source: "WhatsApp" },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().data.status).toBe("new");
  });

  it("move oportunidade de etapa e registra atividade", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/deals/a0000001-0000-4000-8000-000000000001",
      headers: auth(token),
      payload: { stage: "qualified", probability: 55 },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.stage).toBe("qualified");

    const activities = await app.inject({ method: "GET", url: "/api/activities", headers: auth(token) });
    expect(activities.json().data.some((a: { activity_type: string }) => a.activity_type === "deal.stage_changed")).toBe(true);
  });
});

describe("WhatsApp e IA", () => {
  it("garante idempotência no envio de mensagens", async () => {
    const url = "/api/conversations/d0000001-0000-4000-8000-000000000001/messages";
    const payload = { content: "Mensagem idempotente", client_message_id: "test-idempotency-1" };
    const first = await app.inject({ method: "POST", url, headers: auth(token), payload });
    const second = await app.inject({ method: "POST", url, headers: auth(token), payload });
    expect(first.statusCode).toBe(201);
    expect(second.json().data.id).toBe(first.json().data.id);
  });

  it("IA não envia mensagem em conversa manual", async () => {
    const conversationId = "d0000004-0000-4000-8000-000000000004";
    const before = await app.inject({ method: "GET", url: `/api/conversations/${conversationId}/messages`, headers: auth(token) });
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/chat",
      headers: auth(token),
      payload: { message: "envie uma mensagem de follow-up para este contato", conversation_id: conversationId },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.answer).toContain("bloqueada");
    const after = await app.inject({ method: "GET", url: `/api/conversations/${conversationId}/messages`, headers: auth(token) });
    expect(after.json().data).toHaveLength(before.json().data.length);
  });

  it("vendedor não pode alterar o modo de IA", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/conversations/d0000001-0000-4000-8000-000000000001/ai-mode",
      headers: auth(sellerToken),
      payload: { ai_mode: "automatic" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("resume conversa com dados reais", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/summarize",
      headers: auth(token),
      payload: { conversation_id: "d0000001-0000-4000-8000-000000000001" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.summary).toContain("Lucas Menezes");
  });
});

describe("WhatsApp stateless + automações sem fila (Render Free)", () => {
  const organizationId = "11111111-1111-4111-8111-111111111111";
  const chat = "5511900000000@s.whatsapp.net";
  const webhookHeaders = { "x-nexus-webhook-secret": "nexus-webhook-dev-secret" };

  function webhookPayload(messageId: string, content: string) {
    return {
      organization_id: organizationId,
      external_chat_id: chat,
      external_message_id: messageId,
      sender: "5511900000000",
      recipient: "+551132908800",
      content,
      message_type: "text",
      customer_name: "Contato Webhook",
    };
  }

  it("processa mensagem recebida e ignora duplicidade", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/api/webhooks/whatsapp",
      headers: webhookHeaders,
      payload: webhookPayload("wh-1", "Olá, qual é o SLA de suporte?"),
    });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json().data;
    expect(firstBody.skipped).toBe(false);

    const conversation = store.conversations.find((c) => c.external_chat_id === chat);
    expect(conversation).toBeTruthy();
    const messages = store.messages.filter((m) => m.conversation_id === conversation!.id);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.direction).toBe("inbound");
    expect(store.customers.some((c) => c.name === "Contato Webhook")).toBe(true);

    await app.inject({
      method: "POST",
      url: "/api/webhooks/whatsapp",
      headers: webhookHeaders,
      payload: webhookPayload("wh-1", "Olá, qual é o SLA de suporte?"),
    });
    expect(store.messages.filter((m) => m.conversation_id === conversation!.id)).toHaveLength(1);
  });

  it("modo automático responde sem intervenção humana", async () => {
    const conversation = store.conversations.find((c) => c.external_chat_id === chat)!;
    conversation.ai_mode = "automatic";
    await app.inject({
      method: "POST",
      url: "/api/webhooks/whatsapp",
      headers: webhookHeaders,
      payload: webhookPayload("wh-2", "Vocês cobrem LGPD no contrato?"),
    });
    const outbound = store.messages.filter(
      (m) => m.conversation_id === conversation.id && m.direction === "outbound",
    );
    expect(outbound).toHaveLength(1);
    expect(outbound[0]?.content?.toLowerCase()).toContain("lgpd");
  });

  it("protege webhook e cron com secrets", async () => {
    const noSecret = await app.inject({
      method: "POST",
      url: "/api/webhooks/whatsapp",
      payload: webhookPayload("wh-3", "sem secret"),
    });
    expect(noSecret.statusCode).toBe(401);

    const cronDenied = await app.inject({ method: "POST", url: "/api/internal/followup/run", payload: { organization_id: organizationId } });
    expect(cronDenied.statusCode).toBe(401);

    const cronOk = await app.inject({
      method: "POST",
      url: "/api/internal/followup/run",
      headers: { "x-cron-secret": "nexus-cron-dev-secret" },
      payload: { organization_id: organizationId },
    });
    expect(cronOk.statusCode).toBe(200);
    expect(cronOk.json().data).toHaveProperty("created_tasks");

    const health = await app.inject({ method: "GET", url: "/api/internal/health" });
    expect(health.json().queue).toBe("disabled");
  });
});
