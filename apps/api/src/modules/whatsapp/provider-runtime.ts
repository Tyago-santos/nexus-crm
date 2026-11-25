import { createWhatsAppProvider, type WhatsAppProvider } from "../../integrations/whatsapp";
import type { BaileysProvider } from "../../integrations/whatsapp/baileys-provider";
import type { MetaCloudProvider } from "../../integrations/whatsapp/meta-cloud";
import { store } from "../../shared/store";
import { processIncomingMessage } from "./incoming-service";

type Logger = {
  info: (o: unknown, m?: string) => void;
  error: (o: unknown, m?: string) => void;
};

let provider: WhatsAppProvider | null = null;
let configured = false;

/**
 * Provider de WhatsApp é opcional. Em Render Free use meta_cloud (webhook
 * stateless). Baileys funciona localmente/VPS por exigir processo persistente.
 */
export async function configureWhatsAppProvider(logger: Logger) {
  if (configured) return provider;
  configured = true;
  provider = await createWhatsAppProvider(logger, (accountId, qr) => {
    store.pendingQr.set(accountId, qr);
    const account = store.accounts.find((a) => a.id === accountId);
    if (account) {
      account.connection_status = "connecting";
      account.updated_at = new Date().toISOString();
    }
  }, (accountId, status) => {
    const account = store.accounts.find((a) => a.id === accountId);
    if (!account) return;
    account.connection_status = status;
    account.updated_at = new Date().toISOString();
    if (status === "connected") store.pendingQr.delete(accountId);
  });
  provider?.onMessage(async (message) => {
    await processIncomingMessage(message, provider);
  });
  return provider;
}

export function getWhatsAppProvider() {
  return provider;
}

export function getBaileysProvider(): BaileysProvider | null {
  return provider?.name === "baileys" ? (provider as BaileysProvider) : null;
}

export function getMetaCloudProvider(): MetaCloudProvider | null {
  return provider?.name === "meta_cloud" ? (provider as MetaCloudProvider) : null;
}
