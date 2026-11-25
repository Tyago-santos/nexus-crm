import type { Customer, Deal, Lead, Task, Automation, Activity, Message, Conversation } from "@nexus/schemas";

export interface UserRef {
  id: string | null;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export interface CustomerWithMeta extends Customer {
  assigned_to_user: UserRef;
}

export interface CustomerDetail extends CustomerWithMeta {
  deals: Deal[];
  conversations: Array<{ id: string; status: string; ai_mode: string; last_message_at: string }>;
  tasks: Task[];
  activities: Activity[];
}

export interface LeadWithMeta extends Lead {
  customer: Customer | null;
  assigned_to_user: UserRef;
}

export interface DealWithMeta extends Deal {
  customer: Customer | null;
  assigned_to_user: UserRef;
}

export interface TaskWithMeta extends Task {
  customer: Customer | null;
  assigned_to_user: UserRef;
}

export interface ConversationRow {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_company: string | null;
  avatar_initials: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  ai_mode: "manual" | "copilot" | "automatic";
  status: "open" | "pending" | "closed" | "archived";
  assigned_to: string | null;
  assigned_to_name: string;
  tags: string[];
  customer_id: string | null;
  external_chat_id: string;
}

export interface ConversationMessage extends Message {}

export interface WhatsappAccount {
  id: string;
  organization_id: string;
  phone_number: string;
  provider: "baileys" | "meta_cloud";
  connection_status: "connected" | "connecting" | "disconnected" | "error";
  session_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityWithUser extends Activity {
  user: UserRef;
}

export interface AutomationRow extends Automation {}

export interface DashboardData {
  customers: number;
  new_leads: number;
  open_deals: number;
  won_deals: number;
  revenue: number;
  conversion_rate: number;
  conversations: number;
  pending_conversations: number;
  sales_by_month: Array<{ month: string; meta: number; realizado: number }>;
  funnel: Array<{ stage: string; count: number; value: number }>;
  insights: Array<{ id: string; severity: string; title: string; description: string }>;
  activities: ActivityWithUser[];
  tasks: TaskWithMeta[];
}

export interface SalesReport {
  revenue: number;
  won_deals: number;
  average_ticket: number;
  by_stage: Array<{ stage: string; count: number; value: number }>;
  by_owner: Array<{ owner: string; revenue: number; deals: number }>;
}

export interface AiChatResult {
  answer: string;
  tools_used: string[];
  interaction_id: string;
  agent_type: "support" | "sales" | "analyst" | "followup";
}

export interface AiSuggestion {
  conversation_id: string;
  suggestion: string;
  confidence: number;
  mode: "manual" | "copilot" | "automatic";
  requires_approval: boolean;
}

export interface AiSummary {
  summary: string;
  key_points: string[];
  messages_count: number;
  customer: Customer | null;
  conversation: Conversation;
}

export interface QualifyResult {
  score: number;
  probability: number;
  customer: string | null;
  reasoning: string[];
  next_steps: string[];
  task_id: string;
}

export interface TeamMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "manager" | "seller" | "support";
  created_at: string;
  user: UserRef;
}
