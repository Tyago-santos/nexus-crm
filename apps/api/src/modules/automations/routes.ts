import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../../config/env";
import { authenticate, requirePermission } from "../../middlewares/auth";
import { AppError } from "../../shared/errors";
import { parse } from "../../shared/validate";
import { runCustomerCreatedAutomation, runDealWonAutomation, runFollowupAutomation } from "./service";

function requireCronSecret(headers: Record<string, unknown>) {
  if (headers["x-cron-secret"] !== env.CRON_SECRET) {
    throw new AppError(401, "UNAUTHORIZED", "Cron secret inválido");
  }
}

/**
 * Cron HTTP (ex.: cron-job.org) para rotinas sem fila no Render Free.
 * Protegido por segredo; não expõe dados e executa apenas regras internas.
 */
export async function internalAutomationRoutes(app: FastifyInstance) {
  /** Execução manual pela interface (autenticada), também sem fila. */
  app.post(
    "/automations/run-followup",
    { preHandler: [authenticate, requirePermission("automations:manage")] },
    async (request) => ({ data: runFollowupAutomation(request.auth.organization_id) }),
  );

  app.post("/internal/followup/run", async (request) => {
    requireCronSecret(request.headers);
    const body = parse(z.object({ organization_id: z.string().uuid() }), request.body);
    return { data: runFollowupAutomation(body.organization_id) };
  });

  app.post("/internal/automations/customer-created", async (request) => {
    requireCronSecret(request.headers);
    const body = parse(
      z.object({ organization_id: z.string().uuid(), customer_id: z.string().uuid(), name: z.string().min(1) }),
      request.body,
    );
    return { data: runCustomerCreatedAutomation(body.organization_id, body.customer_id, body.name) };
  });

  app.post("/internal/automations/deal-won", async (request) => {
    requireCronSecret(request.headers);
    const body = parse(z.object({ organization_id: z.string().uuid(), deal_id: z.string().uuid() }), request.body);
    return { data: runDealWonAutomation(body.organization_id, body.deal_id) };
  });

  app.get("/internal/health", async () => ({
    status: "ok",
    mode: "synchronous",
    queue: "disabled",
    whatsapp_provider: env.WHATSAPP_PROVIDER,
  }));
}
