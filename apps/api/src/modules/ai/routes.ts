import type { FastifyInstance } from "fastify";
import { aiChatSchema, qualifyLeadSchema, summarizeSchema } from "@nexus/schemas";
import { authenticate, requirePermission } from "../../middlewares/auth";
import { parse } from "../../shared/validate";
import { store } from "../../shared/store";
import { chat, qualifyLead, suggestReply, summarizeConversation } from "./agent";

export async function aiRoutes(app: FastifyInstance) {
  app.post("/ai/chat", { preHandler: [authenticate, requirePermission("ai:use")] }, async (request) => {
    const input = parse(aiChatSchema, request.body);
    return {
      data: await chat(
        request.auth.organization_id,
        request.auth.user_id,
        request.auth.role,
        input.message,
        input.conversation_id,
      ),
    };
  });

  app.post("/ai/summarize", { preHandler: [authenticate, requirePermission("ai:use")] }, async (request) => {
    const input = parse(summarizeSchema, request.body);
    return { data: await summarizeConversation(request.auth.organization_id, input.conversation_id) };
  });

  app.post("/ai/qualify-lead", { preHandler: [authenticate, requirePermission("ai:use")] }, async (request) => {
    const input = parse(qualifyLeadSchema, request.body);
    return {
      data: qualifyLead(request.auth.organization_id, request.auth.user_id, input.lead_id, input.notes),
    };
  });

  app.get("/ai/suggest/:conversationId", { preHandler: [authenticate, requirePermission("ai:use")] }, async (request) => {
    const { conversationId } = request.params as { conversationId: string };
    return { data: await suggestReply(request.auth.organization_id, conversationId) };
  });

  app.get("/ai/interactions", { preHandler: [authenticate, requirePermission("ai:use")] }, async (request) => {
    return {
      data: store.aiInteractions.filter((i) => i.organization_id === request.auth.organization_id).slice(0, 50),
    };
  });
}
