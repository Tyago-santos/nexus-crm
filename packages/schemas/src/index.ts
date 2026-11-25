import { z } from "zod";

export const idSchema = z.string().uuid();
export const timestamps = {
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
};

export const roleSchema = z.enum(["owner", "admin", "manager", "seller", "support"]);
export type Role = z.infer<typeof roleSchema>;

export const dealStageSchema = z.enum([
  "new_lead",
  "first_contact",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
]);
export type DealStage = z.infer<typeof dealStageSchema>;

export const leadStatusSchema = z.enum(["new", "contacted", "qualified", "converted", "lost"]);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

export const taskStatusSchema = z.enum(["pending", "in_progress", "done", "cancelled"]);
export const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const conversationStatusSchema = z.enum(["open", "pending", "closed", "archived"]);
export const aiModeSchema = z.enum(["manual", "copilot", "automatic"]);
export const messageDirectionSchema = z.enum(["inbound", "outbound"]);
export const messageTypeSchema = z.enum(["text", "image", "document", "audio", "video", "location"]);
export const connectionStatusSchema = z.enum(["connected", "connecting", "disconnected", "error"]);
export const agentTypeSchema = z.enum(["support", "sales", "analyst", "followup"]);

export const customerSchema = z.object({
  id: idSchema,
  organization_id: idSchema,
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(8),
  company: z.string().nullable().optional(),
  document: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  assigned_to: idSchema.nullable().optional(),
  created_by: idSchema,
  ...timestamps,
});
export type Customer = z.infer<typeof customerSchema>;

export const createCustomerSchema = customerSchema
  .pick({
    name: true,
    email: true,
    phone: true,
    company: true,
    document: true,
    address: true,
    notes: true,
    tags: true,
    assigned_to: true,
  })
  .partial({ email: true, company: true, document: true, address: true, notes: true, tags: true, assigned_to: true })
  .extend({ email: z.string().email().nullable().optional() });
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export const updateCustomerSchema = createCustomerSchema.partial();

export const leadSchema = z.object({
  id: idSchema,
  organization_id: idSchema,
  customer_id: idSchema,
  title: z.string().min(1),
  source: z.string().nullable(),
  status: leadStatusSchema,
  assigned_to: idSchema.nullable(),
  ...timestamps,
});
export type Lead = z.infer<typeof leadSchema>;

export const createLeadSchema = z.object({
  customer_id: idSchema,
  title: z.string().min(2).max(160),
  source: z.string().max(80).optional(),
  assigned_to: idSchema.optional(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export const updateLeadSchema = createLeadSchema.partial().extend({ status: leadStatusSchema.optional() });

export const dealSchema = z.object({
  id: idSchema,
  organization_id: idSchema,
  customer_id: idSchema,
  lead_id: idSchema.nullable(),
  title: z.string().min(1),
  value: z.number().nonnegative(),
  stage: dealStageSchema,
  probability: z.number().int().min(0).max(100),
  assigned_to: idSchema.nullable(),
  expected_close_date: z.string().nullable(),
  ...timestamps,
});
export type Deal = z.infer<typeof dealSchema>;

export const createDealSchema = z.object({
  customer_id: idSchema,
  lead_id: idSchema.nullable().optional(),
  title: z.string().min(2).max(160),
  value: z.number().nonnegative(),
  stage: dealStageSchema.default("new_lead"),
  probability: z.number().int().min(0).max(100).default(20),
  assigned_to: idSchema.optional(),
  expected_close_date: z.string().optional(),
});
export type CreateDealInput = z.infer<typeof createDealSchema>;
export const updateDealSchema = createDealSchema.partial();

export const taskSchema = z.object({
  id: idSchema,
  organization_id: idSchema,
  customer_id: idSchema.nullable(),
  deal_id: idSchema.nullable(),
  assigned_to: idSchema,
  title: z.string().min(1),
  description: z.string().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  due_date: z.string().nullable(),
  ...timestamps,
});
export type Task = z.infer<typeof taskSchema>;

export const createTaskSchema = z.object({
  customer_id: idSchema.optional(),
  deal_id: idSchema.optional(),
  assigned_to: idSchema.optional(),
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  priority: taskPrioritySchema.default("medium"),
  due_date: z.string().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export const updateTaskSchema = createTaskSchema.partial().extend({ status: taskStatusSchema.optional() });

export const whatsappAccountSchema = z.object({
  id: idSchema,
  organization_id: idSchema,
  phone_number: z.string(),
  provider: z.enum(["baileys", "meta_cloud"]),
  connection_status: connectionStatusSchema,
  session_reference: z.string().nullable(),
  ...timestamps,
});
export type WhatsappAccount = z.infer<typeof whatsappAccountSchema>;

export const conversationSchema = z.object({
  id: idSchema,
  organization_id: idSchema,
  whatsapp_account_id: idSchema,
  customer_id: idSchema.nullable(),
  external_chat_id: z.string(),
  status: conversationStatusSchema,
  assigned_to: idSchema.nullable(),
  ai_mode: aiModeSchema,
  last_message_at: z.string(),
  ...timestamps,
});
export type Conversation = z.infer<typeof conversationSchema>;

export const messageSchema = z.object({
  id: idSchema,
  organization_id: idSchema,
  conversation_id: idSchema,
  external_message_id: z.string(),
  sender: z.string(),
  recipient: z.string(),
  direction: messageDirectionSchema,
  message_type: messageTypeSchema,
  content: z.string().nullable(),
  media_url: z.string().nullable(),
  status: z.enum(["queued", "sent", "delivered", "read", "failed"]),
  created_at: z.string().datetime(),
});
export type Message = z.infer<typeof messageSchema>;

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(4096).optional(),
  message_type: messageTypeSchema.default("text"),
  media_url: z.string().url().optional(),
}).refine((v) => Boolean(v.content) || Boolean(v.media_url), {
  message: "content ou media_url é obrigatório",
});

export const aiChatSchema = z.object({
  message: z.string().min(1).max(4000),
  conversation_id: idSchema.optional(),
});

export const qualifyLeadSchema = z.object({
  lead_id: idSchema,
  notes: z.string().max(4000).optional(),
});

export const summarizeSchema = z.object({
  conversation_id: idSchema,
});

export const activitySchema = z.object({
  id: idSchema,
  organization_id: idSchema,
  customer_id: idSchema.nullable(),
  user_id: idSchema.nullable(),
  activity_type: z.string(),
  description: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
});
export type Activity = z.infer<typeof activitySchema>;

export const automationSchema = z.object({
  id: idSchema,
  organization_id: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  trigger_type: z.string(),
  conditions: z.record(z.unknown()),
  actions: z.array(z.record(z.unknown())),
  is_active: z.boolean(),
  ...timestamps,
});
export type Automation = z.infer<typeof automationSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = loginSchema.extend({
  full_name: z.string().min(2).max(120),
  organization_name: z.string().min(2).max(120),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const dashboardReportSchema = z.object({
  customers: z.number(),
  new_leads: z.number(),
  open_deals: z.number(),
  won_deals: z.number(),
  revenue: z.number(),
  conversion_rate: z.number(),
  conversations: z.number(),
  pending_conversations: z.number(),
  sales_by_month: z.array(z.object({ month: z.string(), meta: z.number(), realizado: z.number() })),
  funnel: z.array(z.object({ stage: dealStageSchema, count: z.number(), value: z.number() })),
  insights: z.array(z.object({ id: z.string(), severity: z.string(), title: z.string(), description: z.string() })),
});
export type DashboardReport = z.infer<typeof dashboardReportSchema>;
