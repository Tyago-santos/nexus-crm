import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError, unauthorized } from "../shared/errors";
import { store } from "../shared/store";
import type { Role } from "@nexus/schemas";
import { can, type Permission } from "@nexus/shared";

export interface AuthPayload {
  sub: string;
  organization_id: string;
  role: Role;
  full_name: string;
  email: string;
}

export interface AuthContext {
  user_id: string;
  organization_id: string;
  role: Role;
  full_name: string;
  email: string;
}

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthContext;
  }
}

export async function authenticate(request: FastifyRequest): Promise<void> {
  try {
    const payload = await request.jwtVerify<AuthPayload>();
    const member = store.memberFor(payload.sub, payload.organization_id);
    if (!member) throw unauthorized();
    request.auth = {
      user_id: payload.sub,
      organization_id: payload.organization_id,
      role: member.role,
      full_name: payload.full_name,
      email: payload.email,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw unauthorized();
  }
}

export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!can(request.auth.role, permission)) {
      throw new AppError(403, "FORBIDDEN", `Permissão necessária: ${permission}`);
    }
  };
}
