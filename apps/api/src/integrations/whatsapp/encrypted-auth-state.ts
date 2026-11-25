import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import baileysModule, {
  BufferJSON,
  initAuthCreds,
  type AuthenticationState,
  type SignalKeyStore,
} from "@whiskeysockets/baileys";

/** Baileys expõe `proto` apenas no default export em ESM (Node 22+). */
const proto = (baileysModule as unknown as { proto: { Message: typeof import("@whiskeysockets/baileys").proto.Message } }).proto;

/**
 * Sessões Baileys são credenciais sensíveis. Este store cifra o arquivo de
 * autenticação em repouso com AES-256-GCM antes de gravar no disco.
 */
export async function useEncryptedAuthState(
  filePath: string,
  secret: string,
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const salt = "nexus-crm-whatsapp-session";
  const key = scryptSync(secret, salt, 32);
  mkdirSync(dirname(filePath), { recursive: true, mode: 0o700 });

  type Stored = { creds: unknown; keys: Record<string, Record<string, unknown>> };
  let data: Stored = { creds: initAuthCreds(), keys: {} };

  if (existsSync(filePath)) {
    try {
      const [ivB64, tagB64, payloadB64] = readFileSync(filePath, "utf8").split(":");
      if (!ivB64 || !tagB64 || !payloadB64) throw new Error("formato inválido");
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
      decipher.setAuthTag(Buffer.from(tagB64, "base64"));
      const plain = Buffer.concat([decipher.update(Buffer.from(payloadB64, "base64")), decipher.final()]);
      data = JSON.parse(plain.toString("utf8"), BufferJSON.reviver) as Stored;
    } catch {
      data = { creds: initAuthCreds(), keys: {} };
    }
  }

  const persist = () => {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const plain = Buffer.from(JSON.stringify(data, BufferJSON.replacer), "utf8");
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    writeFileSync(
      filePath,
      [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(":"),
      { mode: 0o600 },
    );
  };

  const keys = {
    async get(type: string, ids: string[]) {
      const bucket = data.keys[type] ?? {};
      return Object.fromEntries(
        ids.flatMap((id) => {
          const value = bucket[id];
          return value === undefined ? [] : [[id, JSON.parse(JSON.stringify(value), BufferJSON.reviver)]];
        }),
      );
    },
    async set(values: Record<string, Record<string, unknown>>) {
      for (const [type, entries] of Object.entries(values)) {
        data.keys[type] ??= {};
        for (const [id, value] of Object.entries(entries)) {
          data.keys[type]![id] = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
        }
      }
      persist();
    },
    async clear() {
      data.keys = {};
      persist();
    },
  } as unknown as SignalKeyStore;

  return {
    state: { creds: data.creds as AuthenticationState["creds"], keys },
    saveCreds: async () => {
      persist();
    },
  };
}

export { proto };
