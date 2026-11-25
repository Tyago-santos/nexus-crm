export interface IncomingWhatsAppMessage {
  organizationId: string;
  accountId: string;
  externalChatId: string;
  externalMessageId: string;
  sender: string;
  recipient: string;
  content: string | null;
  messageType: "text" | "image" | "document" | "audio" | "video" | "location";
  mediaUrl: string | null;
  timestamp: string;
  customerName?: string;
}

export interface WhatsAppProvider {
  readonly name: "baileys" | "meta_cloud";
  readonly requiresPersistentProcess: boolean;
  connect(accountId: string): Promise<{ qr?: string; status: "connecting" | "connected" }>;
  disconnect(accountId: string): Promise<void>;
  sendText(accountId: string, to: string, content: string): Promise<{ externalMessageId: string }>;
  onMessage(handler: (message: IncomingWhatsAppMessage) => Promise<void>): void;
}
