import type { FastifyInstance } from "fastify";
import { createCustomerSchema, updateCustomerSchema } from "@nexus/schemas";
import { authenticate, requirePermission } from "../../middlewares/auth";
import { parse } from "../../shared/validate";
import { store } from "../../shared/store";
import { runCustomerCreatedAutomation } from "../automations/service";

export async function customerRoutes(app: FastifyInstance) {
  app.get("/customers", { preHandler: [authenticate, requirePermission("customers:read")] }, async (request) => {
    const query = request.query as { search?: string; tag?: string; assigned_to?: string };
    return { data: store.listCustomers(request.auth.organization_id, query) };
  });

  app.post("/customers", { preHandler: [authenticate, requirePermission("customers:write")] }, async (request, reply) => {
    const input = parse(createCustomerSchema, request.body);
    const customer = store.createCustomer(request.auth.organization_id, request.auth.user_id, input);
    const automationActive = store.automations.some(
      (a) => a.organization_id === request.auth.organization_id && a.trigger_type === "customer.created" && a.is_active,
    );
    if (automationActive) {
      runCustomerCreatedAutomation(request.auth.organization_id, customer.id, customer.name);
    }
    reply.code(201);
    return { data: customer };
  });

  app.get("/customers/:id", { preHandler: [authenticate, requirePermission("customers:read")] }, async (request) => {
    const { id } = request.params as { id: string };
    return { data: store.getCustomer(request.auth.organization_id, id) };
  });

  app.patch("/customers/:id", { preHandler: [authenticate, requirePermission("customers:write")] }, async (request) => {
    const { id } = request.params as { id: string };
    const input = parse(updateCustomerSchema, request.body);
    return { data: store.updateCustomer(request.auth.organization_id, id, input) };
  });

  app.delete("/customers/:id", { preHandler: [authenticate, requirePermission("customers:delete")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    store.deleteCustomer(request.auth.organization_id, id);
    reply.code(204);
    return null;
  });
}
