import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requirePermission } from "../../middlewares/auth";
import { parse } from "../../shared/validate";
import { store } from "../../shared/store";

const inviteSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email(),
  role: z.enum(["admin", "manager", "seller", "support"]),
  password: z.string().min(6).default("nexus123"),
});

export async function teamRoutes(app: FastifyInstance) {
  app.get("/team", { preHandler: [authenticate, requirePermission("team:manage")] }, async (request) => {
    return { data: store.membersOf(request.auth.organization_id) };
  });

  app.post("/team", { preHandler: [authenticate, requirePermission("team:manage")] }, async (request, reply) => {
    const input = parse(inviteSchema, request.body);
    if (store.findUserByEmail(input.email)) throw Object.assign(new Error("E-mail já cadastrado"), { statusCode: 409 });
    const user = {
      id: crypto.randomUUID(),
      full_name: input.full_name,
      email: input.email,
      avatar_url: null,
      password: input.password,
      created_at: new Date().toISOString(),
    };
    store.users.push(user);
    store.members.push({
      id: crypto.randomUUID(),
      organization_id: request.auth.organization_id,
      user_id: user.id,
      role: input.role,
      created_at: new Date().toISOString(),
    });
    reply.code(201);
    return { data: { id: user.id, email: user.email, full_name: user.full_name, role: input.role } };
  });

  app.patch("/team/:id", { preHandler: [authenticate, requirePermission("team:manage")] }, async (request) => {
    const { id } = request.params as { id: string };
    const input = parse(z.object({ role: z.enum(["admin", "manager", "seller", "support"]) }), request.body);
    const member = store.members.find((m) => m.user_id === id && m.organization_id === request.auth.organization_id);
    if (!member) throw Object.assign(new Error("Membro não encontrado"), { statusCode: 404 });
    member.role = input.role;
    return { data: member };
  });
}
