import { join } from "node:path";
import * as baileysNamespace from "@whiskeysockets/baileys";
import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import type { IncomingWhatsAppMessage, WhatsAppProvider } from "./provider";
import { useEncryptedAuthState } from "./encrypted-auth-state";

/**
 * A forma do export default do Baileys muda conforme o interop ESM/CJS do
 * runtime (Node 22/24/25 + tsx). Resolvemos em runtime para aceitar tanto
 * `default` função quanto `default.makeWASocket` / export nomeado.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baileys = baileysNamespace as any;

const makeWASocket = (() => {
  const candidates = [baileys.default, baileys.default?.default, baileys.makeWASocket, baileys];
  const fn = candidates.find((candidate) => typeof candidate === "function");
  if (!fn) throw new Error("makeWASocket não encontrado no módulo Baileys");
  return fn as typeof import("@whiskeysockets/baileys").default;
})();

const DisconnectReason =
  baileys.DisconnectReason ?? baileys.default?.DisconnectReason ?? ({ loggedOut: 401 } as const);

const fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion as
  | (() => Promise<{ version: [number, number, number]; isLatest?: boolean }>)
  | undefined;

type MessageHandler = (message: IncomingWhatsAppMessage) => Promise<void>;

/**
 * Baileys exige um processo persistente. No Render Free o serviço hiberna,
 * por isso este provider é recomendado apenas para desenvolvimento local/VPS.
 */
export class BaileysProvider implements WhatsAppProvider {
  readonly name = "baileys" as const;
  readonly requiresPersistentProcess = true;
  private sockets = new Map<string, WASocket>();
  private handler: MessageHandler | null = null;
  private organizationByAccount = new Map<string, string>();
  private waVersion: [number, number, number] | undefined;

  constructor(
    private readonly options: {
      sessionsDir: string;
      encryptionKey: string;
      onQr: (accountId: string, qr: string) => void;
      onConnection?: (accountId: string, status: "connected" | "connecting" | "disconnected", phoneNumber?: string) => void;
      logger: { info: (o: unknown, m?: string) => void; error: (o: unknown, m?: string) => void };
    },
  ) {}

  onMessage(handler: MessageHandler) {
    this.handler = handler;
  }

  registerAccount(accountId: string, organizationId: string) {
    this.organizationByAccount.set(accountId, organizationId);
  }

  async connect(accountId: string) {
    const existing = this.sockets.get(accountId);
    if (existing) return { status: "connected" as const };
    const { state, saveCreds } = await useEncryptedAuthState(
      join(this.options.sessionsDir, `${accountId}.json`),
      this.options.encryptionKey,
    );
    const socket = makeWASocket({
      auth: state,
      version: await this.resolveVersion(),
      printQRInTerminal: false,
      syncFullHistory: true,
    });
    this.sockets.set(accountId, socket);

    socket.ev.on("creds.update", saveCreds);
    socket.ev.on("connection.update", async (update) => {
      if (update.qr) this.options.onQr(accountId, update.qr);
      if (update.connection === "open") {
        const phone = socket.user?.id?.split(":")[0]?.split("@")[0];
        this.options.onConnection?.(accountId, "connected", phone ? `+${phone}` : undefined);
      }
      if (update.connection === "close") {
        this.sockets.delete(accountId);
        const statusCode = (update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output
          ?.statusCode;
        if (statusCode !== DisconnectReason.loggedOut) {
          this.options.onConnection?.(accountId, "connecting");
          setTimeout(() => void this.connect(accountId), 5_000);
        } else {
          this.options.onConnection?.(accountId, "disconnected");
        }
      }
    });
    socket.ev.on("messages.upsert", async (event) => {
      const isHistory = event.type === "append";
      if (event.type !== "notify" && event.type !== "append") return;
      for (const message of event.messages) {
        if (message.key.fromMe) continue;
        const jid = message.key.remoteJid;
        if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast") continue;
        try {
          await this.handleMessage(accountId, message, isHistory);
        } catch {
          // Ignora mensagens individuais que falhem (ex.: sem texto).
        }
      }
    });
    return { status: "connecting" as const };
  }

  private async resolveVersion() {
    if (this.waVersion) return this.waVersion;
    try {
      const latest = await fetchLatestBaileysVersion?.();
      if (latest?.version) this.waVersion = latest.version;
    } catch {
      // mantém a versão embutida do Baileys
    }
    return this.waVersion;
  }

  async disconnect(accountId: string) {
    const socket = this.sockets.get(accountId);
    if (!socket) return;
    await socket.logout();
    this.sockets.delete(accountId);
  }

  async sendText(accountId: string, to: string, content: string) {
    const socket = this.sockets.get(accountId);
    if (!socket) throw new Error("Conta WhatsApp não conectada");
    const jid = to.includes("@") ? to : `${to.replace(/\D/g, "")}@s.whatsapp.net`;
    const result = await socket.sendMessage(jid, { text: content });
    return { externalMessageId: result?.key.id ?? "" };
  }

  private async handleMessage(accountId: string, message: WAMessage, isHistory = false) {
    if (!message.message || !message.key.remoteJid || message.key.fromMe) return;
    const content = message.message;
    const messageType = content.imageMessage
      ? "image"
      : content.documentMessage
        ? "document"
        : content.audioMessage
          ? "audio"
          : content.videoMessage
            ? "video"
            : content.locationMessage
              ? "location"
              : "text";
    const text =
      content.conversation ??
      content.extendedTextMessage?.text ??
      content.imageMessage?.caption ??
      content.documentMessage?.caption ??
      null;
    const organizationId = this.organizationByAccount.get(accountId);
    if (!organizationId) return;
    await this.handler?.({
      organizationId,
      accountId,
      externalChatId: message.key.remoteJid,
      externalMessageId: message.key.id ?? `${Date.now()}`,
      sender: message.key.remoteJid,
      recipient: "me",
      content: text,
      messageType,
      mediaUrl: null,
      timestamp: new Date(Number(message.messageTimestamp ?? Date.now()) * 1000).toISOString(),
      isHistory,
    });
  }
}
