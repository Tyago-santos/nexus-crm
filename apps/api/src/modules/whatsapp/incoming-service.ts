import type { IncomingWhatsAppMessage, WhatsAppProvider } from "../../integrations/whatsapp/provider";
import { store } from "../../shared/store";
import { suggestReply } from "../ai/agent";

function memberContext(orgId: string, assignedTo: string | null) {
  const member =
    store.members.find((m) => m.organization_id === orgId && m.user_id === assignedTo) ??
    store.members.find((m) => m.organization_id === orgId && m.role === "owner") ??
    store.members.find((m) => m.organization_id === orgId);
  if (!member) throw new Error("Organização sem membros");
  return member;
}

/**
 * Processamento síncrono de mensagem recebida — sem fila e sem worker.
 * Idempotência garantida por external_message_id.
 */
export async function processIncomingMessage(
  data: IncomingWhatsAppMessage,
  provider: WhatsAppProvider | null = null,
) {
  const ingested = store.ingestIncomingMessage(data.organizationId, {
    externalChatId: data.externalChatId,
    externalMessageId: data.externalMessageId,
    sender: data.sender,
    content: data.content,
    messageType: data.messageType,
    createdAt: data.timestamp,
    customerName: data.customerName,
    accountId: data.accountId,
  });
  if (ingested.duplicate) return { skipped: true as const, reason: "duplicate" as const };

  const conversation = ingested.conversation;
  if (conversation.ai_mode === "manual") {
    return { skipped: false as const, ai: "manual" as const, conversation_id: conversation.id };
  }

  const member = memberContext(data.organizationId, conversation.assigned_to);
  const suggestion = await suggestReply(data.organizationId, conversation.id);

  if (conversation.ai_mode === "automatic") {
    store.sendMessage(data.organizationId, conversation.id, member.user_id, {
      content: suggestion.suggestion,
      message_type: "text",
      client_message_id: `ai.auto.${ingested.message.id}`,
    });
    if (provider) {
      await provider.sendText(data.accountId, data.externalChatId, suggestion.suggestion);
    }
    return {
      skipped: false as const,
      ai: "sent" as const,
      conversation_id: conversation.id,
      answer: suggestion.suggestion,
    };
  }

  return {
    skipped: false as const,
    ai: "suggested" as const,
    conversation_id: conversation.id,
    suggestion: suggestion.suggestion,
  };
}
