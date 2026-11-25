import type { FastifyInstance } from "fastify";
import { authenticate, requirePermission } from "../../middlewares/auth";
import { store } from "../../shared/store";

export async function reportRoutes(app: FastifyInstance) {
  app.get("/reports/dashboard", { preHandler: [authenticate, requirePermission("reports:read")] }, async (request) => {
    return { data: store.dashboard(request.auth.organization_id) };
  });

  app.get("/reports/sales", { preHandler: [authenticate, requirePermission("reports:read")] }, async (request) => {
    const deals = store.listDeals(request.auth.organization_id);
    const won = deals.filter((d) => d.stage === "won");
    const byOwner = new Map<string, { owner: string; revenue: number; deals: number }>();
    for (const deal of won) {
      const owner = deal.assigned_to_user.full_name;
      const current = byOwner.get(owner) ?? { owner, revenue: 0, deals: 0 };
      current.revenue += deal.value;
      current.deals += 1;
      byOwner.set(owner, current);
    }
    return {
      data: {
        revenue: won.reduce((sum, d) => sum + d.value, 0),
        won_deals: won.length,
        average_ticket: won.length ? Math.round(won.reduce((s, d) => s + d.value, 0) / won.length) : 0,
        by_stage: store.dashboard(request.auth.organization_id).funnel,
        by_owner: [...byOwner.values()].sort((a, b) => b.revenue - a.revenue),
      },
    };
  });

  app.get("/activities", { preHandler: [authenticate, requirePermission("reports:read")] }, async (request) => {
    const query = request.query as { limit?: string };
    return { data: store.listActivities(request.auth.organization_id, Number(query.limit ?? 20)) };
  });
}

export async function automationRoutes(app: FastifyInstance) {
  app.get("/automations", { preHandler: [authenticate, requirePermission("automations:manage")] }, async (request) => {
    return { data: store.listAutomations(request.auth.organization_id) };
  });

  app.patch("/automations/:id", { preHandler: [authenticate, requirePermission("automations:manage")] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { is_active?: boolean };
    return { data: store.toggleAutomation(request.auth.organization_id, id, Boolean(body.is_active)) };
  });
}
