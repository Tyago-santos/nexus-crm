import type { FastifyInstance } from "fastify";
import { createTaskSchema, updateTaskSchema } from "@nexus/schemas";
import { authenticate, requirePermission } from "../../middlewares/auth";
import { parse } from "../../shared/validate";
import { store } from "../../shared/store";

export async function taskRoutes(app: FastifyInstance) {
  app.get("/tasks", { preHandler: [authenticate, requirePermission("tasks:read")] }, async (request) => {
    const query = request.query as { status?: string; assigned_to?: string };
    return { data: store.listTasks(request.auth.organization_id, query) };
  });

  app.post("/tasks", { preHandler: [authenticate, requirePermission("tasks:write")] }, async (request, reply) => {
    const input = parse(createTaskSchema, request.body);
    const task = store.createTask(request.auth.organization_id, request.auth.user_id, input);
    reply.code(201);
    return { data: task };
  });

  app.patch("/tasks/:id", { preHandler: [authenticate, requirePermission("tasks:write")] }, async (request) => {
    const { id } = request.params as { id: string };
    const input = parse(updateTaskSchema, request.body);
    return { data: store.updateTask(request.auth.organization_id, id, input) };
  });
}
