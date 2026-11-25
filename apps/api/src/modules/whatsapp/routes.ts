import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requirePermission } from "../../middlewares/auth";
import { parse } from "../../shared/validate";
import { store } from "../../shared/store";
import { AppError } from "../../shared/errors";
import { getBaileysProvider, getWhatsAppProvider } from "./provider-runtime";

export async function whatsappRoutes(app: FastifyInstance) {
  app.get("/whatsapp/accounts", { preHandler: [authenticate, requirePermission("conversations:read")] }, async (request) => {
    return { data: store.listAccounts(request.auth.organization_id) };
  });

  app.post("/whatsapp/connect", { preHandler: [authenticate, requirePermission("whatsapp:connect")] }, async (request) => {
    const orgId = request.auth.organization_id;
    const provider = getWhatsAppProvider();
    const baileys = getBaileysProvider();
    // Sem provider ativo, gera um QR de demonstração para validar o fluxo visual.
    const { account, qr } = store.connectAccount(orgId, { demoQr: !provider });
    if (provider?.name === "meta_cloud") {
      await provider.connect(account.id);
      return { data: { account: store.confirmConnection(orgId, account.id), qr: null, provider: provider.name } };
    }
    if (baileys) {
      baileys.registerAccount(account.id, orgId);
      await baileys.connect(account.id);
      // O QR real chega de forma assíncrona em /whatsapp/:id/qr.
      return { data: { account, qr: null, provider: baileys.name } };
    }
    return { data: { account, qr, provider: provider?.name ?? "demo" } };
  });

  app.get("/whatsapp/:id/qr", { preHandler: [authenticate, requirePermission("whatsapp:connect")] }, async (request) => {
    const { id } = request.params as { id: string };
    return { data: store.getQr(request.auth.organization_id, id) };
  });

  app.post("/whatsapp/:id/confirm", { preHandler: [authenticate, requirePermission("whatsapp:connect")] }, async (request) => {
    const { id } = request.params as { id: string };
    getBaileysProvider()?.registerAccount(id, request.auth.organization_id);
    return { data: store.confirmConnection(request.auth.organization_id, id) };
  });

  app.post("/whatsapp/:id/disconnect", { preHandler: [authenticate, requirePermission("whatsapp:connect")] }, async (request) => {
    const { id } = request.params as { id: string };
    await getWhatsAppProvider()?.disconnect(id);
    return { data: store.disconnectAccount(request.auth.organization_id, id) };
  });

  app.post("/whatsapp/:id/reconnect", { preHandler: [authenticate, requirePermission("whatsapp:connect")] }, async (request) => {
    const { id } = request.params as { id: string };
    const accounts = store.listAccounts(request.auth.organization_id);
    if (!accounts.some((a) => a.id === id)) throw new AppError(404, "NOT_FOUND", "Conta WhatsApp não encontrada");
    const provider = getWhatsAppProvider();
    const baileys = getBaileysProvider();
    const { account, qr } = store.connectAccount(request.auth.organization_id, { demoQr: !provider });
    if (provider?.name === "meta_cloud") {
      await provider.connect(account.id);
      return { data: { account: store.confirmConnection(request.auth.organization_id, account.id), qr: null } };
    }
    if (baileys) {
      baileys.registerAccount(account.id, request.auth.organization_id);
      await baileys.connect(account.id);
    }
    return { data: { account, qr } };
  });
}

export async function conversationRoutes(app: FastifyInstance) {
  app.get("/conversations", { preHandler: [authenticate, requirePermission("conversations:read")] }, async (request) => {
    const query = request.query as { search?: string; status?: string };
    return { data: store.listConversations(request.auth.organization_id, query) };
  });

  app.get("/conversations/:id/messages", { preHandler: [authenticate, requirePermission("conversations:read")] }, async (request) => {
    const { id } = request.params as { id: string };
    return { data: store.listMessages(request.auth.organization_id, id) };
  });

  app.post("/conversations/:id/read", { preHandler: [authenticate, requirePermission("conversations:read")] }, async (request) => {
    const { id } = request.params as { id: string };
    return { data: store.markConversationRead(request.auth.organization_id, id) };
  });

  app.post("/conversations/:id/messages", { preHandler: [authenticate, requirePermission("whatsapp:send")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = parse(
      z.object({
        content: z.string().min(1).max(4096).optional(),
        message_type: z.enum(["text", "image", "document", "audio", "video", "location"]).default("text"),
        media_url: z.string().url().optional(),
        client_message_id: z.string().min(4).max(120).optional(),
      }).refine((v) => Boolean(v.content) || Boolean(v.media_url), { message: "content ou media_url é obrigatório" }),
      request.body,
    );
    const message = store.sendMessage(request.auth.organization_id, id, request.auth.user_id, input);
    reply.code(201);
    return { data: message };
  });

  app.patch("/conversations/:id/ai-mode", { preHandler: [authenticate, requirePermission("ai:configure")] }, async (request) => {
    const { id } = request.params as { id: string };
    const input = parse(z.object({ ai_mode: z.enum(["manual", "copilot", "automatic"]) }), request.body);
    return { data: store.setConversationAiMode(request.auth.organization_id, id, input.ai_mode) };
  });

  app.post("/conversations/:id/transfer", { preHandler: [authenticate, requirePermission("conversations:write")] }, async (request) => {
    const { id } = request.params as { id: string };
    const input = parse(z.object({ assigned_to: z.string().uuid() }), request.body);
    return { data: store.transferConversation(request.auth.organization_id, id, input.assigned_to) };
  });
}
