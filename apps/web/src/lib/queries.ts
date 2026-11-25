import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AiChatResult,
  AiSuggestion,
  AiSummary,
  AutomationRow,
  ConversationMessage,
  ConversationRow,
  CustomerDetail,
  CustomerWithMeta,
  DashboardData,
  DealWithMeta,
  LeadWithMeta,
  QualifyResult,
  SalesReport,
  TaskWithMeta,
  TeamMember,
  WhatsappAccount,
} from "@/lib/types";
import type { Activity, Customer, Deal, Lead, Task, WhatsappAccount as Account } from "@nexus/schemas";
import type { ActivityWithUser } from "@/lib/types";

function useRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  sales: ["reports", "sales"] as const,
  customers: (search = "", tag = "") => ["customers", search, tag] as const,
  customer: (id: string) => ["customer", id] as const,
  leads: ["leads"] as const,
  deals: ["deals"] as const,
  tasks: (status = "") => ["tasks", status] as const,
  team: ["team"] as const,
  conversations: (search = "") => ["conversations", search] as const,
  messages: (id: string) => ["messages", id] as const,
  accounts: ["whatsapp-accounts"] as const,
  automations: ["automations"] as const,
  activities: ["activities"] as const,
};

export function useDashboard() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: () => api.get<DashboardData>("/reports/dashboard") });
}

export function useSalesReport() {
  return useQuery({ queryKey: queryKeys.sales, queryFn: () => api.get<SalesReport>("/reports/sales") });
}

export function useCustomers(search = "", tag = "") {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (tag) params.set("tag", tag);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: queryKeys.customers(search, tag),
    queryFn: () => api.get<CustomerWithMeta[]>(`/customers${suffix}`),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customer(id ?? ""),
    queryFn: () => api.get<CustomerDetail>(`/customers/${id}`),
    enabled: Boolean(id),
  });
}

export function useLeads() {
  return useQuery({ queryKey: queryKeys.leads, queryFn: () => api.get<LeadWithMeta[]>("/leads") });
}

export function useDeals() {
  return useQuery({ queryKey: queryKeys.deals, queryFn: () => api.get<DealWithMeta[]>("/deals") });
}

export function useTasks(status = "") {
  const suffix = status ? `?status=${status}` : "";
  return useQuery({ queryKey: queryKeys.tasks(status), queryFn: () => api.get<TaskWithMeta[]>(`/tasks${suffix}`) });
}

export function useTeam(enabled = true) {
  return useQuery({ queryKey: queryKeys.team, queryFn: () => api.get<TeamMember[]>("/team"), enabled, retry: false });
}

export function useConversations(search = "") {
  const suffix = search ? `?search=${encodeURIComponent(search)}` : "";
  return useQuery({
    queryKey: queryKeys.conversations(search),
    queryFn: () => api.get<ConversationRow[]>(`/conversations${suffix}`),
    placeholderData: keepPreviousData,
    refetchInterval: 12_000,
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: queryKeys.messages(conversationId ?? ""),
    queryFn: () => api.get<ConversationMessage[]>(`/conversations/${conversationId}/messages`),
    enabled: Boolean(conversationId),
    refetchInterval: 8_000,
  });
}

export function useAccounts(options: { refetchInterval?: number | false } = {}) {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => api.get<Account[]>("/whatsapp/accounts"),
    refetchInterval: options.refetchInterval,
  });
}

export function useAutomations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.automations,
    queryFn: () => api.get<AutomationRow[]>("/automations"),
    enabled,
    retry: false,
  });
}

export function useActivities(limit = 20, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.activities, limit, enabled],
    queryFn: () => api.get<ActivityWithUser[]>(`/activities?limit=${limit}`),
    enabled,
  });
}

export function useCreateCustomer() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => api.post<Customer>("/customers", input),
    onSuccess: refresh,
  });
}

export function useUpdateCustomer() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      api.patch<Customer>(`/customers/${id}`, input),
    onSuccess: refresh,
  });
}

export function useCreateLead() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { customer_id: string; title: string; source?: string; assigned_to?: string }) =>
      api.post<Lead>("/leads", input),
    onSuccess: refresh,
  });
}

export function useUpdateLead() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      api.patch<Lead>(`/leads/${id}`, input),
    onSuccess: refresh,
  });
}

export function useCreateDeal() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: {
      customer_id: string;
      title: string;
      value: number;
      stage?: string;
      probability?: number;
      expected_close_date?: string;
      assigned_to?: string;
      lead_id?: string;
    }) => api.post<Deal>("/deals", input),
    onSuccess: refresh,
  });
}

export function useUpdateDeal() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      api.patch<Deal>(`/deals/${id}`, input),
    onSuccess: refresh,
  });
}

export function useCreateTask() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => api.post<Task>("/tasks", input),
    onSuccess: refresh,
  });
}

export function useUpdateTask() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      api.patch<Task>(`/tasks/${id}`, input),
    onSuccess: refresh,
  });
}

export function useSendMessage() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      api.post(`/conversations/${conversationId}/messages`, {
        content,
        message_type: "text",
        client_message_id: `web.${crypto.randomUUID()}`,
      }),
    onSuccess: refresh,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => api.post(`/conversations/${conversationId}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useSetAiMode() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: "manual" | "copilot" | "automatic" }) =>
      api.patch(`/conversations/${id}/ai-mode`, { ai_mode: mode }),
    onSuccess: refresh,
  });
}

export function useTransferConversation() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      api.post(`/conversations/${id}/transfer`, { assigned_to: userId }),
    onSuccess: refresh,
  });
}

export function useToggleAutomation() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/automations/${id}`, { is_active: isActive }),
    onSuccess: refresh,
  });
}

export function useRunFollowup() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: () => api.post<{ created_tasks: number }>("/automations/run-followup"), onSuccess: refresh });
}

export function useInviteMember() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { full_name: string; email: string; role: string; password?: string }) =>
      api.post("/team", input),
    onSuccess: refresh,
  });
}

export function useUpdateMemberRole() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => api.patch(`/team/${userId}`, { role }),
    onSuccess: refresh,
  });
}

export function useAiChat() {
  return useMutation({
    mutationFn: (input: { message: string; conversation_id?: string }) =>
      api.post<AiChatResult>("/ai/chat", input),
  });
}

export function useQualifyLead() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { lead_id: string; notes?: string }) => api.post<QualifyResult>("/ai/qualify-lead", input),
    onSuccess: refresh,
  });
}

export function useAiSummarize() {
  return useMutation({
    mutationFn: (conversationId: string) => api.post<AiSummary>("/ai/summarize", { conversation_id: conversationId }),
  });
}

export function useAiSuggestion(conversationId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["ai-suggestion", conversationId],
    queryFn: () => api.get<AiSuggestion>(`/ai/suggest/${conversationId}`),
    enabled: Boolean(conversationId) && enabled,
    staleTime: 0,
    retry: false,
  });
}

export function useConnectWhatsApp() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: () => api.post<{ qr: string | null; account: WhatsappAccount; provider: string }>("/whatsapp/connect"),
    onSuccess: refresh,
  });
}

export function useDisconnectWhatsApp() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (accountId: string) => api.post(`/whatsapp/${accountId}/disconnect`),
    onSuccess: refresh,
  });
}

export function useConfirmWhatsApp() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (accountId: string) => api.post<Account>(`/whatsapp/${accountId}/confirm`),
    onSuccess: refresh,
  });
}

/**
 * Poll do QR real do Baileys. Enquanto o socket negocia, o endpoint pode
 * responder 409 (nenhum QR pendente); tratamos como "ainda não disponível".
 */
export function useWhatsAppQr(accountId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["whatsapp-qr", accountId],
    queryFn: async () => {
      try {
        const data = await api.get<{ qr: string; expires_at: string }>(`/whatsapp/${accountId}/qr`);
        return data.qr;
      } catch {
        return null;
      }
    },
    enabled: Boolean(accountId) && enabled,
    refetchInterval: enabled ? 3000 : false,
    retry: false,
  });
}

export function useActivitiesList(limit = 30): { data?: ActivityWithUser[]; isLoading: boolean } {
  const { data, isLoading } = useActivities(limit);
  return { data, isLoading };
}

export type { Activity, DealWithMeta, TaskWithMeta };
