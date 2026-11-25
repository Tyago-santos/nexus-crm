import type { IncomingWhatsAppMessage, WhatsAppProvider } from "./provider";

/**
 * Meta Cloud API é stateless: recebe mensagens por webhook e envia por HTTP.
 * É o modo recomendado para Render Free, onde não há processo persistente.
 */
export class MetaCloudProvider implements WhatsAppProvider {
  readonly name = "meta_cloud" as const;
  readonly requiresPersistentProcess = false;
  private handler: ((message: IncomingWhatsAppMessage) => Promise<void>) | null = null;

  constructor(
    private readonly config: { phoneNumberId: string; accessToken: string },
    private readonly logger: { info: (o: unknown, m?: string) => void },
  ) {}

  onMessage(handler: (message: IncomingWhatsAppMessage) => Promise<void>) {
    this.handler = handler;
  }

  /** O webhook da Meta é recebido pela rota HTTP; não há QR Code. */
  async connect(_accountId: string) {
    return { status: "connected" as const };
  }

  async disconnect(_accountId: string) {
    this.logger.info({}, "Meta Cloud API não mantém sessão local para desconectar");
  }

  async sendText(_accountId: string, to: string, content: string) {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${this.config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.config.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to.replace(/\D/g, ""),
          type: "text",
          text: { preview_url: false, body: content },
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Falha ao enviar pela Meta Cloud API: ${response.status} ${await response.text()}`);
    }
    const payload = (await response.json()) as { messages?: Array<{ id: string }> };
    return { externalMessageId: payload.messages?.[0]?.id ?? "" };
  }

  /** Converte o payload oficial da Meta em mensagens internas. */
  async handleWebhook(payload: {
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string };
          contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
          messages?: Array<{
            id: string;
            from: string;
            timestamp: string;
            type: string;
            text?: { body: string };
            image?: { caption?: string };
            document?: { caption?: string };
          }>;
        };
      }>;
    }>;
  }, organizationId: string, accountId: string) {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const contactName = value?.contacts?.[0]?.profile?.name;
        for (const message of value?.messages ?? []) {
          if (!this.handler) continue;
          const type = ["image", "document", "audio", "video", "location"].includes(message.type)
            ? (message.type as IncomingWhatsAppMessage["messageType"])
            : "text";
          await this.handler({
            organizationId,
            accountId,
            externalChatId: `${message.from}@s.whatsapp.net`,
            externalMessageId: message.id,
            sender: message.from,
            recipient: value?.metadata?.phone_number_id ?? this.config.phoneNumberId,
            content: message.text?.body ?? message.image?.caption ?? message.document?.caption ?? null,
            messageType: type,
            mediaUrl: null,
            timestamp: new Date(Number(message.timestamp) * 1000).toISOString(),
            customerName: contactName,
          });
        }
      }
    }
  }
}
