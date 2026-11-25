export type * from "@nexus/schemas";
export type * from "./database";

export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export interface SessionUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: "owner" | "admin" | "manager" | "seller" | "support";
  organization: { id: string; name: string; slug: string };
}

export interface ConversationWithCustomer {
  id: string;
  customer_name: string;
  customer_phone: string;
  avatar_initials: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  ai_mode: "manual" | "copilot" | "automatic";
  status: "open" | "pending" | "closed" | "archived";
  assigned_to_name: string;
  tags: string[];
}

export interface AiSuggestion {
  id: string;
  conversation_id: string;
  content: string;
  confidence: number;
  created_at: string;
}
