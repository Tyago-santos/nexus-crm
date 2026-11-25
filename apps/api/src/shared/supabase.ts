import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@nexus/types";
import { env } from "../config/env";
import type { Member, Organization } from "./store";

let client: SupabaseClient<Database> | null = null;

export function isSupabaseEnabled(): boolean {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const hasValidKeyFormat = Boolean(key && (key.startsWith("eyJ") || key.startsWith("sb_secret_")));
  return Boolean(env.SUPABASE_URL && hasValidKeyFormat);
}

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!isSupabaseEnabled()) return null;
  if (client) return client;
  client = createClient<Database>(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export async function persistUser(user: {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}): Promise<void> {
  if (!isSupabaseEnabled()) return;
  const sb = getSupabaseClient();
  if (!sb) return;
  const { error } = await sb.from("users").upsert(
    {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      avatar_url: user.avatar_url,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function persistOrganization(organization: {
  id: string;
  name: string;
  slug: string;
}): Promise<void> {
  if (!isSupabaseEnabled()) return;
  const sb = getSupabaseClient();
  if (!sb) return;
  const { error } = await sb.from("organizations").insert({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
  });
  if (error) throw error;
}

export async function persistMember(member: {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
}): Promise<void> {
  if (!isSupabaseEnabled()) return;
  const sb = getSupabaseClient();
  if (!sb) return;
  const { error } = await sb.from("organization_members").insert({
    id: member.id,
    organization_id: member.organization_id,
    user_id: member.user_id,
    role: member.role,
  });
  if (error) throw error;
}

export async function fetchMembership(
  userId: string,
): Promise<{ member: Member; organization: Organization } | null> {
  if (!isSupabaseEnabled()) return null;
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data: member, error } = await sb
    .from("organization_members")
    .select("id, organization_id, user_id, role, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !member) return null;
  const { data: organization } = await sb
    .from("organizations")
    .select("id, name, slug, created_at, updated_at")
    .eq("id", member.organization_id)
    .maybeSingle();
  if (!organization) return null;
  return {
    member: { ...member, role: member.role as Member["role"] } as Member,
    organization: organization as Organization,
  };
}

export async function persistConversation(conversation: {
  id: string;
  organization_id: string;
  whatsapp_account_id: string;
  customer_id: string | null;
  external_chat_id: string;
  status: string;
  assigned_to: string | null;
  ai_mode: string;
  unread_count: number;
  tags: string[];
  last_message_at: string;
}): Promise<void> {
  if (!isSupabaseEnabled()) return;
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    await sb.from("conversations").upsert(
      {
        id: conversation.id,
        organization_id: conversation.organization_id,
        whatsapp_account_id: conversation.whatsapp_account_id,
        customer_id: conversation.customer_id,
        external_chat_id: conversation.external_chat_id,
        status: conversation.status,
        assigned_to: conversation.assigned_to,
        ai_mode: conversation.ai_mode,
        unread_count: conversation.unread_count,
        tags: conversation.tags,
        last_message_at: conversation.last_message_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch {}
}

export async function persistMessage(message: {
  id: string;
  organization_id: string;
  conversation_id: string;
  external_message_id: string;
  sender: string;
  recipient: string;
  direction: string;
  message_type: string;
  content: string | null;
  media_url: string | null;
  status: string;
  created_at: string;
}): Promise<void> {
  if (!isSupabaseEnabled()) return;
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    await sb.from("messages").upsert(
      {
        id: message.id,
        organization_id: message.organization_id,
        conversation_id: message.conversation_id,
        external_message_id: message.external_message_id,
        sender: message.sender,
        recipient: message.recipient,
        direction: message.direction,
        message_type: message.message_type,
        content: message.content,
        media_url: message.media_url,
        status: message.status,
        created_at: message.created_at,
      },
      { onConflict: "id" },
    );
  } catch {}
}

export async function persistCustomer(customer: any): Promise<void> {
  if (!isSupabaseEnabled()) return;
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    await sb.from("customers").upsert(
      {
        id: customer.id,
        organization_id: customer.organization_id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        document: customer.document,
        address: customer.address,
        notes: customer.notes,
        tags: customer.tags,
        assigned_to: customer.assigned_to,
        created_by: customer.created_by,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      },
      { onConflict: "id" },
    );
  } catch {}
}

export async function deleteCustomer(id: string): Promise<void> {
  if (!isSupabaseEnabled()) return;
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    await sb.from("customers").delete().eq("id", id);
  } catch {}
}

export async function hydrateCustomers(store: { customers: any[] }): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { data } = await sb.from("customers").select("*");
    if (data && data.length) store.customers = data;
  } catch {}
}

export async function persistWhatsAppAccount(account: {
  id: string;
  organization_id: string;
  phone_number: string;
  provider: string;
  connection_status: string;
  session_reference: string | null;
}): Promise<void> {
  if (!isSupabaseEnabled()) return;
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    await sb.from("whatsapp_accounts").upsert(
      {
        id: account.id,
        organization_id: account.organization_id,
        phone_number: account.phone_number,
        provider: account.provider,
        connection_status: account.connection_status,
        session_reference: account.session_reference,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch {}
}

export async function hydrateWhatsAppStore(store: { accounts: any[]; conversations: any[]; messages: any[] }): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { data: accounts } = await sb.from("whatsapp_accounts").select("*");
    if (accounts && accounts.length) store.accounts = accounts;
    const { data: conversations } = await sb.from("conversations").select("*");
    if (conversations && conversations.length) store.conversations = conversations;
    const { data: messages } = await sb.from("messages").select("*");
    if (messages && messages.length) store.messages = messages;
  } catch {}
}
