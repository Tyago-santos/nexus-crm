export const BRAZIL_COUNTRY_CODE = "55";

/**
 * Normaliza um telefone para E.164 brasileiro (+55DDNNNNNNNNN).
 * Aceita máscaras, espaços, parênteses e prefixos +55/0055.
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  let national = digits;
  if (national.startsWith("0055")) national = national.slice(2);
  if (national.startsWith(BRAZIL_COUNTRY_CODE) && national.length >= 12) {
    national = national.slice(2);
  }
  national = national.replace(/^0+/, "");
  return `+${BRAZIL_COUNTRY_CODE}${national}`;
}

/**
 * Chave canônica usada para impedir duplicidade de contatos na organização.
 * Remove o nono dígito de celulares antigos para comparar 8 e 9 dígitos.
 */
export function phoneMatchKey(input: string): string {
  const e164 = normalizePhone(input);
  const national = e164.replace(`+${BRAZIL_COUNTRY_CODE}`, "");
  if (national.length === 11 && national[2] === "9") {
    return `${BRAZIL_COUNTRY_CODE}${national.slice(0, 2)}${national.slice(3)}`;
  }
  return `${BRAZIL_COUNTRY_CODE}${national}`;
}

export function formatPhone(input: string): string {
  const e164 = normalizePhone(input);
  const national = e164.replace(`+${BRAZIL_COUNTRY_CODE}`, "");
  if (national.length === 11) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  }
  if (national.length === 10) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  }
  return input;
}

export const PERMISSIONS = [
  "customers:read",
  "customers:write",
  "customers:delete",
  "leads:read",
  "leads:write",
  "deals:read",
  "deals:write",
  "tasks:read",
  "tasks:write",
  "conversations:read",
  "conversations:write",
  "whatsapp:connect",
  "whatsapp:send",
  "ai:use",
  "ai:configure",
  "automations:manage",
  "reports:read",
  "team:manage",
  "settings:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

const ROLE_PERMISSIONS: Record<string, ReadonlySet<Permission>> = {
  owner: new Set(ALL),
  admin: new Set(ALL.filter((p) => p !== "settings:manage")),
  manager: new Set([
    "customers:read", "customers:write", "leads:read", "leads:write",
    "deals:read", "deals:write", "tasks:read", "tasks:write",
    "conversations:read", "conversations:write", "whatsapp:send",
    "ai:use", "reports:read", "team:manage",
  ]),
  seller: new Set([
    "customers:read", "customers:write", "leads:read", "leads:write",
    "deals:read", "deals:write", "tasks:read", "tasks:write",
    "conversations:read", "conversations:write", "whatsapp:send",
    "ai:use", "reports:read",
  ]),
  support: new Set([
    "customers:read", "leads:read", "deals:read", "tasks:read",
    "tasks:write", "conversations:read", "conversations:write",
    "whatsapp:send", "ai:use",
  ]),
};

export function can(role: string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export const DEAL_STAGES = [
  { id: "new_lead", label: "Novo Lead", color: "#4f46e5", probability: 10 },
  { id: "first_contact", label: "Primeiro Contato", color: "#6366f1", probability: 25 },
  { id: "qualified", label: "Qualificado", color: "#8b5cf6", probability: 45 },
  { id: "proposal_sent", label: "Proposta Enviada", color: "#a855f7", probability: 60 },
  { id: "negotiation", label: "Em Negociação", color: "#f59e0b", probability: 80 },
  { id: "won", label: "Venda Concluída", color: "#10b981", probability: 100 },
  { id: "lost", label: "Perdido", color: "#94a3b8", probability: 0 },
] as const;

export type DealStageId = (typeof DEAL_STAGES)[number]["id"];

export function stageLabel(stage: string): string {
  return DEAL_STAGES.find((s) => s.id === stage)?.label ?? stage;
}

export function stageIndex(stage: string): number {
  return DEAL_STAGES.findIndex((s) => s.id === stage);
}

/** Chave determinística para evitar duplicidade de mensagens WhatsApp. */
export function messageIdempotencyKey(input: {
  provider: string;
  externalChatId: string;
  externalMessageId: string;
}): string {
  return [input.provider, input.externalChatId, input.externalMessageId].join(":");
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCurrency(value: number): string {
  return brl.format(value);
}

export function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return formatCurrency(value);
}

export function relativeTime(iso: string, now = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}
