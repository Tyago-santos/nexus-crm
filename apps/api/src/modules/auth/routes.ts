import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { loginSchema, registerSchema } from "@nexus/schemas";
import { slugify } from "@nexus/shared";
import { store, type Member, type Organization, type User } from "../../shared/store";
import { AppError, conflict, unauthorized } from "../../shared/errors";
import { parse } from "../../shared/validate";
import { authenticate } from "../../middlewares/auth";
import type { AuthPayload } from "../../middlewares/auth";
import {
  fetchMembership,
  getSupabaseClient,
  isSupabaseEnabled,
  persistMember,
  persistOrganization,
  persistUser,
} from "../../shared/supabase";

function sessionPayload(payload: AuthPayload) {
  return {
    token: undefined as string | undefined,
    user: {
      id: payload.sub,
      full_name: payload.full_name,
      email: payload.email,
      avatar_url: null,
      role: payload.role,
      organization: (() => {
        const org = store.organizations.find((o) => o.id === payload.organization_id);
        return { id: payload.organization_id, name: org?.name ?? "", slug: org?.slug ?? "" };
      })(),
    },
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  }, async (request) => {
    const input = parse(loginSchema, request.body);

    if (isSupabaseEnabled()) {
      const sb = getSupabaseClient()!;
      const { data, error } = await sb.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error || !data.user) {
        throw new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos");
      }
      let user = store.findUserByEmail(input.email) ?? store.users.find((u) => u.email === input.email);
      let member = store.members.find((m) => m.user_id === (user?.id ?? data.user.id));
      // Fallback: o vínculo pode existir só no Supabase (ex.: após reiniciar a API).
      if (!member) {
        const persisted = await fetchMembership(data.user.id);
        if (persisted) {
          if (!store.organizations.some((o) => o.id === persisted.organization.id)) {
            store.organizations.push(persisted.organization);
          }
          if (!user) {
            user = {
              id: data.user.id,
              full_name: data.user.user_metadata?.full_name ?? input.email,
              email: input.email.toLowerCase(),
              avatar_url: null,
              password: "",
              created_at: new Date().toISOString(),
            };
            store.users.push(user);
          }
          member = persisted.member;
          store.members.push(member);
        }
      }
      if (!member) throw unauthorized("Usuário sem organização vinculada");
      const payload: AuthPayload = {
        sub: member.user_id,
        organization_id: member.organization_id,
        role: member.role,
        full_name: user?.full_name ?? data.user.user_metadata?.full_name ?? input.email,
        email: input.email,
      };
      const token = app.jwt.sign(payload, { expiresIn: "7d" });
      return { data: { ...sessionPayload(payload), token } };
    }

    const user = store.findUserByEmail(input.email);
    if (!user || user.password !== input.password) {
      throw new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos");
    }
    const member = store.members.find((m) => m.user_id === user.id);
    if (!member) throw unauthorized("Usuário sem organização vinculada");
    const payload: AuthPayload = {
      sub: user.id,
      organization_id: member.organization_id,
      role: member.role,
      full_name: user.full_name,
      email: user.email,
    };
    const token = app.jwt.sign(payload, { expiresIn: "7d" });
    return { data: { ...sessionPayload(payload), token } };
  });

  app.post("/auth/register", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
  }, async (request, reply) => {
    const input = parse(registerSchema, request.body);

    if (isSupabaseEnabled()) {
      const sb = getSupabaseClient()!;

      // Cria o auth user. Se ele já existir de uma tentativa anterior que falhou
      // no meio, reaproveita desde que ainda não tenha organização vinculada.
      const { data: created, error: createError } = await sb.auth.admin.createUser({
        email: input.email.toLowerCase(),
        password: input.password,
        email_confirm: true,
        user_metadata: { full_name: input.full_name },
      });

      let authUserId: string;
      let createdNow = false;
      if (createError) {
        if (!createError.message?.toLowerCase().includes("already")) {
          throw new AppError(400, "REGISTER_FAILED", createError.message ?? "Falha no registro");
        }
        const { data: page, error: listError } = await sb.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        if (listError) throw new AppError(400, "REGISTER_FAILED", listError.message);
        const existing = page.users.find(
          (u) => u.email?.toLowerCase() === input.email.toLowerCase(),
        );
        if (!existing) throw conflict("E-mail já cadastrado");
        const { data: memberships } = await sb
          .from("organization_members")
          .select("id")
          .eq("user_id", existing.id)
          .limit(1);
        if (memberships && memberships.length > 0) throw conflict("E-mail já cadastrado");
        authUserId = existing.id;
      } else if (created?.user) {
        authUserId = created.user.id;
        createdNow = true;
      } else {
        throw new AppError(400, "REGISTER_FAILED", "Falha no registro");
      }

      // O store em memória não conhece as organizações já gravadas no Supabase,
      // então o slug único precisa ser conferido também no banco.
      const baseSlug = slugify(input.organization_name);
      let slug = baseSlug;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data: existingOrg, error: slugError } = await sb
          .from("organizations")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (slugError) throw slugError;
        if (!existingOrg && !store.orgBySlug(slug)) break;
        slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      }

      const timestamp = new Date().toISOString();
      const organization: Organization = {
        id: randomUUID(),
        name: input.organization_name,
        slug,
        created_at: timestamp,
        updated_at: timestamp,
      };
      const user: User = {
        id: authUserId,
        full_name: input.full_name,
        email: input.email.toLowerCase(),
        avatar_url: null,
        password: input.password,
        created_at: timestamp,
      };
      const member: Member = {
        id: randomUUID(),
        organization_id: organization.id,
        user_id: user.id,
        role: "owner",
        created_at: timestamp,
      };

      let orgPersisted = false;
      try {
        await persistUser(user);
        await persistOrganization(organization);
        orgPersisted = true;
        await persistMember(member);
      } catch (error) {
        // Desfaz o que já foi gravado para permitir uma nova tentativa com o mesmo e-mail.
        if (orgPersisted) {
          await sb.from("organizations").delete().eq("id", organization.id);
        }
        if (createdNow) {
          await sb.auth.admin.deleteUser(authUserId);
        }
        throw error;
      }

      store.organizations.push(organization);
      store.users.push(user);
      store.members.push(member);
      const payload: AuthPayload = {
        sub: user.id,
        organization_id: organization.id,
        role: member.role,
        full_name: user.full_name,
        email: user.email,
      };
      const token = app.jwt.sign(payload, { expiresIn: "7d" });
      reply.code(201);
      return { data: { ...sessionPayload(payload), token } };
    }

    if (store.findUserByEmail(input.email)) {
      throw conflict("E-mail já cadastrado");
    }
    let slug = slugify(input.organization_name);
    if (store.orgBySlug(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const { organization, user, member } = store.createOrganization({
      name: input.organization_name,
      slug,
      owner: {
        full_name: input.full_name,
        email: input.email.toLowerCase(),
        avatar_url: null,
        password: input.password,
      },
    });
    const payload: AuthPayload = {
      sub: user.id,
      organization_id: organization.id,
      role: member.role,
      full_name: user.full_name,
      email: user.email,
    };
    const token = app.jwt.sign(payload, { expiresIn: "7d" });
    reply.code(201);
    return { data: { ...sessionPayload(payload), token } };
  });

  app.get("/auth/me", { preHandler: authenticate }, async (request) => {
    const payload: AuthPayload = {
      sub: request.auth.user_id,
      organization_id: request.auth.organization_id,
      role: request.auth.role,
      full_name: request.auth.full_name,
      email: request.auth.email,
    };
    return { data: sessionPayload(payload).user };
  });

  app.post("/auth/logout", { preHandler: authenticate }, async (_request, reply) => {
    reply.code(204);
    return null;
  });
}
