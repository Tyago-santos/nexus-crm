import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../../config/env";
import { store } from "../../shared/store";
import { AppError } from "../../shared/errors";
import { parse } from "../../shared/validate";
import { processIncomingMessage } from "./incoming-service";
import { getMetaCloudProvider, getWhatsAppProvider } from "./provider-runtime";

const normalizedWebhookSchema = z.object({
  organization_id: z.string().uuid(),
  account_id: z.string().uuid().optional(),
  external_chat_id: z.string().min(3),
  external_message_id: z.string().min(1),
  sender: z.string().min(1),
  recipient: z.string().optional(),
  content: z.string().nullable(),
  message_type: z.enum(["text", "image", "document", "audio", "video", "location"]).default("text"),
  customer_name: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

/**
 * Webhook síncrono — sem fila, sem worker, compatível com Render Free.
 * - Payload normalizado: { organization_id, ... }
 * - Payload Meta Cloud API: `object: "whatsapp_business_account"` + ?organization_id=
 */
export async function whatsappWebhookRoutes(app: FastifyInstance) {
  app.get("/webhooks/whatsapp", async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    if (query["hub.mode"] === "subscribe" && query["hub.verify_token"] === env.WEBHOOK_SECRET) {
      return reply.type("text/plain").send(query["hub.challenge"] ?? "");
    }
    throw new AppError(403, "FORBIDDEN", "Verificação de webhook inválida");
  });

  app.post("/webhooks/whatsapp", async (request, reply) => {
    if (request.headers["x-nexus-webhook-secret"] !== env.WEBHOOK_SECRET) {
      throw new AppError(401, "UNAUTHORIZED", "Webhook secret inválido");
    }
    const body = request.body as Record<string, unknown>;

    if (body?.object === "whatsapp_business_account") {
      const query = request.query as { organization_id?: string; account_id?: string };
      if (!query.organization_id) throw new AppError(400, "MISSING_ORG", "organization_id é obrigatório para webhook Meta");
      const provider = getMetaCloudProvider();
      if (!provider) throw new AppError(503, "PROVIDER_DISABLED", "Provider Meta Cloud não configurado");
      const account = store.accounts.find((a) => a.organization_id === query.organization_id);
      await provider.handleWebhook(body as never, query.organization_id, query.account_id ?? account?.id ?? "");
      return reply.code(200).send({ data: { received: true, provider: "meta_cloud" } });
    }

    const input = parse(normalizedWebhookSchema, body);
    if (!store.organizations.some((o) => o.id === input.organization_id)) {
      throw new AppError(404, "NOT_FOUND", "Organização não encontrada");
    }
    const accountId =
      input.account_id ?? store.accounts.find((a) => a.organization_id === input.organization_id)?.id ?? "";
    const result = await processIncomingMessage(
      {
        organizationId: input.organization_id,
        accountId,
        externalChatId: input.external_chat_id,
        externalMessageId: input.external_message_id,
        sender: input.sender,
        recipient: input.recipient ?? "",
        content: input.content,
        messageType: input.message_type,
        mediaUrl: null,
        timestamp: input.timestamp ?? new Date().toISOString(),
        customerName: input.customer_name,
      },
      getWhatsAppProvider(),
    );
    return reply.code(result.skipped ? 200 : 200).send({ data: result });
  });
}
