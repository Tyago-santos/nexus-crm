import { env } from "../../config/env";
import { MetaCloudProvider } from "./meta-cloud";
import type { WhatsAppProvider } from "./provider";

export type { IncomingWhatsAppMessage, WhatsAppProvider } from "./provider";
export { MetaCloudProvider };

type Logger = {
  info: (o: unknown, m?: string) => void;
  error: (o: unknown, m?: string) => void;
};

/**
 * Fábrica do provider de WhatsApp. Em Render Free use WHATSAPP_PROVIDER=meta_cloud.
 * Baileys é carregado sob demanda (import dinâmico) para não puxar dependências
 * nativas nem falhar o arranque quando o provider está desativado.
 */
export async function createWhatsAppProvider(
  logger: Logger,
  onQr?: (accountId: string, qr: string) => void,
  onConnection?: (accountId: string, status: "connected" | "connecting" | "disconnected") => void,
): Promise<WhatsAppProvider | null> {
  if (env.WHATSAPP_PROVIDER === "disabled") return null;

  if (env.WHATSAPP_PROVIDER === "baileys") {
    logger.info({}, "WhatsApp via Baileys (requer processo persistente; não recomendado no Render Free)");
    const { BaileysProvider } = await import("./baileys-provider");
    return new BaileysProvider({
      sessionsDir: env.WHATSAPP_SESSIONS_DIR,
      encryptionKey: env.SESSION_ENCRYPTION_KEY,
      logger,
      onQr: (accountId, qr) => {
        onQr?.(accountId, qr);
        logger.info({ accountId }, "QR Code Baileys gerado");
      },
      onConnection,
    });
  }

  if (!env.META_WA_PHONE_NUMBER_ID || !env.META_WA_ACCESS_TOKEN) {
    logger.error({}, "WHATSAPP_PROVIDER=meta_cloud exige META_WA_PHONE_NUMBER_ID e META_WA_ACCESS_TOKEN");
    return null;
  }
  logger.info({}, "WhatsApp via Meta Cloud API (webhook stateless)");
  return new MetaCloudProvider(
    {
      phoneNumberId: env.META_WA_PHONE_NUMBER_ID,
      accessToken: env.META_WA_ACCESS_TOKEN,
    },
    logger,
  );
}
