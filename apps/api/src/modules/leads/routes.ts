import type { FastifyInstance } from "fastify";
import { createDealSchema, createLeadSchema, updateDealSchema, updateLeadSchema } from "@nexus/schemas";
import { authenticate, requirePermission } from "../../middlewares/auth";
import { parse } from "../../shared/validate";
import { store } from "../../shared/store";
import { runDealWonAutomation } from "../automations/service";

export async function leadRoutes(app: FastifyInstance) {
  app.get("/leads", { preHandler: [authenticate, requirePermission("leads:read")] }, async (request) => {
    return { data: store.listLeads(request.auth.organization_id) };
  });
  app.post("/leads", { preHandler: [authenticate, requirePermission("leads:write")] }, async (request, reply) => {
    const input = parse(createLeadSchema, request.body);
    const lead = store.createLead(request.auth.organization_id, request.auth.user_id, input);
    reply.code(201);
    return { data: lead };
  });
  app.patch("/leads/:id", { preHandler: [authenticate, requirePermission("leads:write")] }, async (request) => {
    const { id } = request.params as { id: string };
    const input = parse(updateLeadSchema, request.body);
    return { data: store.updateLead(request.auth.organization_id, id, input) };
  });
}

export async function dealRoutes(app: FastifyInstance) {
  app.get("/deals", { preHandler: [authenticate, requirePermission("deals:read")] }, async (request) => {
    return { data: store.listDeals(request.auth.organization_id) };
  });
  app.post("/deals", { preHandler: [authenticate, requirePermission("deals:write")] }, async (request, reply) => {
    const input = parse(createDealSchema, request.body);
    const deal = store.createDeal(request.auth.organization_id, request.auth.user_id, input);
    reply.code(201);
    return { data: deal };
  });
  app.patch("/deals/:id", { preHandler: [authenticate, requirePermission("deals:write")] }, async (request) => {
    const { id } = request.params as { id: string };
    const input = parse(updateDealSchema, request.body);
    const previous = store.deals.find((d) => d.id === id && d.organization_id === request.auth.organization_id);
    const deal = store.updateDeal(request.auth.organization_id, id, request.auth.user_id, input);
    const automationActive = store.automations.some(
      (a) => a.organization_id === request.auth.organization_id && a.trigger_type === "deal.won" && a.is_active,
    );
    if (automationActive && deal.stage === "won" && previous?.stage !== "won") {
      runDealWonAutomation(request.auth.organization_id, deal.id);
    }
    return { data: deal };
  });
}
