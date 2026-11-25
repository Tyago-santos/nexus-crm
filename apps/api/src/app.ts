import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { ZodError } from "zod";
import { env } from "./config/env";
import { AppError } from "./shared/errors";
import { authRoutes } from "./modules/auth/routes";
import { customerRoutes } from "./modules/customers/routes";
import { dealRoutes, leadRoutes } from "./modules/leads/routes";
import { taskRoutes } from "./modules/tasks/routes";
import { teamRoutes } from "./modules/organizations/routes";
import { conversationRoutes, whatsappRoutes } from "./modules/whatsapp/routes";
import { whatsappWebhookRoutes } from "./modules/whatsapp/webhooks";
import { aiRoutes } from "./modules/ai/routes";
import { automationRoutes, reportRoutes } from "./modules/reports/routes";
import { internalAutomationRoutes } from "./modules/automations/routes";
import { configureWhatsAppProvider } from "./modules/whatsapp/provider-runtime";

export async function buildApp(options: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            level: env.NODE_ENV === "production" ? "info" : "debug",
            transport:
              env.NODE_ENV === "development"
                ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
                : undefined,
          },
    bodyLimit: 2 * 1024 * 1024,
  });

  const allowedOrigins = env.WEB_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: (origin, callback) => {
      const allowed =
        !origin ||
        allowedOrigins.includes(origin) ||
        origin === "http://localhost:4173" ||
        origin === "http://127.0.0.1:5173" ||
        /^https:\/\/nexus-[a-z0-9-]+-tyago-santos-projects\.vercel\.app$/.test(origin);
      if (allowed) callback(null, true);
      else callback(new Error("Origem não permitida"), false);
    },
    credentials: true,
  });
  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Nexus CRM AI API",
        description: "API multi-tenant do CRM com WhatsApp e agentes de IA controlados por ferramentas.",
        version: "0.1.0",
      },
      servers: [{ url: "http://localhost:3333" }],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Dados inválidos", details: error.flatten() } });
    }
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details },
      });
    }
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode && statusCode < 500) {
      return reply.code(statusCode).send({ error: { code: "REQUEST_ERROR", message: (error as Error).message } });
    }
    request.log.error({ err: error }, "Erro interno do servidor");
    return reply.code(500).send({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  });

  app.get("/health", async () => ({ status: "ok", service: "nexus-api" }));

  await configureWhatsAppProvider(app.log);

  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(customerRoutes);
      await api.register(leadRoutes);
      await api.register(dealRoutes);
      await api.register(taskRoutes);
      await api.register(teamRoutes);
      await api.register(whatsappRoutes);
      await api.register(whatsappWebhookRoutes);
      await api.register(conversationRoutes);
      await api.register(aiRoutes);
      await api.register(reportRoutes);
      await api.register(automationRoutes);
      await api.register(internalAutomationRoutes);
      api.get("/health", async () => ({ status: "ok", service: "nexus-api" }));
    },
    { prefix: "/api" },
  );

  return app;
}
