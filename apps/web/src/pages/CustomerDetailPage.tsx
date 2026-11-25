import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckSquare,
  Clock,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Sparkles,
  Tag,
  Target,
  UserCheck,
} from "lucide-react";
import { useAiSummarize, useCreateDeal, useCreateTask, useCustomer, useUpdateCustomer, useUpdateTask } from "@/lib/queries";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Progress, Select, Skeleton, Textarea } from "@/components/ui";
import { cn, formatCompactCurrency, formatCurrency, formatDate, formatPhone, relativeTime, stageLabel } from "@/lib/utils";
import { useToast } from "@/components/toast";
import type { AiSummary } from "@/lib/types";

const stageTone: Record<string, "primary" | "success" | "warning" | "danger" | "neutral" | "ai"> = {
  new_lead: "primary",
  first_contact: "primary",
  qualified: "ai",
  proposal_sent: "warning",
  negotiation: "warning",
  won: "success",
  lost: "neutral",
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: customer, isLoading, refetch } = useCustomer(id);
  const updateCustomer = useUpdateCustomer();
  const createDeal = useCreateDeal();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const summarize = useAiSummarize();

  const [editOpen, setEditOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", company: "", tags: "", notes: "" });
  const [dealForm, setDealForm] = useState({ title: "", value: "", stage: "new_lead", probability: "45", expected_close_date: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "medium", due_date: "" });
  const [error, setError] = useState<string | null>(null);

  const openDeals = useMemo(() => (customer?.deals ?? []).filter((deal) => !["won", "lost"].includes(deal.stage)), [customer]);
  const pipelineValue = openDeals.reduce((sum, deal) => sum + deal.value, 0);
  const wonValue = (customer?.deals ?? []).filter((deal) => deal.stage === "won").reduce((sum, deal) => sum + deal.value, 0);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-28" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-80 lg:col-span-2" /><Skeleton className="h-80" /></div></div>;
  }

  if (!customer) {
    return <EmptyState icon={<UserCheck className="size-5" />} title="Cliente não encontrado" description="O contacto pode ter sido removido ou pertence a outra organização." action={<Button onClick={() => navigate("/clientes")}>Voltar para clientes</Button>} />;
  }

  const conversation = customer.conversations[0];

  function openEdit() {
    if (!customer) return;
    setEditForm({
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone,
      company: customer.company ?? "",
      tags: customer.tags.join(", "),
      notes: customer.notes ?? "",
    });
    setEditOpen(true);
  }

  function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!customer) return;
    updateCustomer.mutate(
      {
        id: customer.id,
        input: {
          name: editForm.name,
          email: editForm.email || null,
          phone: editForm.phone,
          company: editForm.company || null,
          notes: editForm.notes || null,
          tags: editForm.tags.split(",").map((item) => item.trim()).filter(Boolean),
        },
      },
      {
        onSuccess: () => {
          toast("Ficha do cliente atualizada.");
          setEditOpen(false);
        },
        onError: (cause) => setError(cause instanceof Error ? cause.message : "Não foi possível atualizar."),
      },
    );
  }

  function saveDeal(event: React.FormEvent) {
    event.preventDefault();
    if (!customer) return;
    createDeal.mutate(
      {
        customer_id: customer.id,
        title: dealForm.title,
        value: Number(dealForm.value) || 0,
        stage: dealForm.stage,
        probability: Number(dealForm.probability) || 20,
        ...(dealForm.expected_close_date ? { expected_close_date: new Date(dealForm.expected_close_date).toISOString() } : {}),
      },
      {
        onSuccess: () => {
          toast("Oportunidade criada.");
          setDealOpen(false);
          setDealForm({ title: "", value: "", stage: "new_lead", probability: "45", expected_close_date: "" });
          refetch();
        },
        onError: (cause) => setError(cause instanceof Error ? cause.message : "Não foi possível criar a oportunidade."),
      },
    );
  }

  function saveTask(event: React.FormEvent) {
    event.preventDefault();
    if (!customer) return;
    createTask.mutate(
      {
        customer_id: customer.id,
        title: taskForm.title,
        description: taskForm.description || undefined,
        priority: taskForm.priority,
        ...(taskForm.due_date ? { due_date: new Date(taskForm.due_date).toISOString() } : {}),
      },
      {
        onSuccess: () => {
          toast("Tarefa criada.");
          setTaskOpen(false);
          setTaskForm({ title: "", description: "", priority: "medium", due_date: "" });
          refetch();
        },
        onError: (cause) => setError(cause instanceof Error ? cause.message : "Não foi possível criar a tarefa."),
      },
    );
  }

  return (
    <div className="animate-fade-up">
      <button type="button" onClick={() => navigate("/clientes")} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-primary">
        <ArrowLeft className="size-3.5" /> Voltar para clientes
      </button>

      <PageHeader
        eyebrow={
          <Badge variant="outline">
            Cliente desde {formatDate(customer.created_at)}
          </Badge>
        }
        title={customer.name}
        description={[customer.company, formatPhone(customer.phone), customer.email].filter(Boolean).join(" · ")}
        actions={
          <>
            <Button variant="secondary" onClick={openEdit}>Editar</Button>
            <Button
              variant="secondary"
              leftIcon={<MessageCircle className="size-3.5" />}
              onClick={() => navigate(conversation ? `/whatsapp?conversa=${conversation.id}` : `/whatsapp?cliente=${customer.id}`)}
            >
              WhatsApp
            </Button>
            <Button variant="secondary" leftIcon={<Target className="size-3.5" />} onClick={() => setDealOpen(true)}>Oportunidade</Button>
            <Button leftIcon={<CheckSquare className="size-3.5" />} onClick={() => setTaskOpen(true)}>Nova tarefa</Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-3.5"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Pipeline aberto</p><p className="mt-1 text-lg font-extrabold text-ink">{formatCurrency(pipelineValue)}</p><p className="text-[10px] text-muted">{openDeals.length} oportunidade(s)</p></Card>
        <Card className="p-3.5"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Receita ganha</p><p className="mt-1 text-lg font-extrabold text-secondary">{formatCurrency(wonValue)}</p><p className="text-[10px] text-muted">{(customer.deals ?? []).filter((deal) => deal.stage === "won").length} venda(s)</p></Card>
        <Card className="p-3.5"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Tarefas abertas</p><p className="mt-1 text-lg font-extrabold text-ink">{customer.tasks.filter((task) => task.status !== "done").length}</p><p className="text-[10px] text-muted">de {customer.tasks.length} no total</p></Card>
        <Card className="p-3.5"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Interações</p><p className="mt-1 text-lg font-extrabold text-ink">{customer.activities.length}</p><p className="text-[10px] text-muted">{conversation ? "conversa WhatsApp ativa" : "sem conversa ativa"}</p></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Target className="size-4 text-primary" /> Oportunidades</h2>
              <Button variant="secondary" size="sm" leftIcon={<Plus className="size-3.5" />} onClick={() => setDealOpen(true)}>Nova</Button>
            </div>
            <div className="mt-3 space-y-2">
              {(customer.deals ?? []).length === 0 ? (
                <EmptyState title="Sem oportunidades" description="Crie uma oportunidade para acompanhar este cliente no pipeline." />
              ) : (
                customer.deals.map((deal) => (
                  <div key={deal.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Target className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{deal.title}</p>
                      <p className="text-[11px] text-muted">Fecho previsto: {deal.expected_close_date ? formatDate(deal.expected_close_date) : "não definido"}</p>
                      <Progress value={deal.probability} tone={deal.stage === "won" ? "success" : "primary"} className="mt-1.5 h-1.5 max-w-48" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-ink">{formatCompactCurrency(deal.value)}</p>
                      <Badge variant={stageTone[deal.stage] ?? "neutral"}>{stageLabel(deal.stage)}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><CheckSquare className="size-4 text-primary" /> Tarefas</h2>
              <Button variant="secondary" size="sm" leftIcon={<Plus className="size-3.5" />} onClick={() => setTaskOpen(true)}>Nova</Button>
            </div>
            <div className="mt-3 space-y-2">
              {customer.tasks.length === 0 ? <EmptyState title="Sem tarefas" description="Nenhuma atividade pendente para este cliente." /> : customer.tasks.map((task) => (
                <div key={task.id} className="flex items-start gap-2.5 rounded-xl border border-line p-2.5">
                  <button
                    type="button"
                    aria-label="Alternar tarefa"
                    onClick={() => updateTask.mutate({ id: task.id, input: { status: task.status === "done" ? "pending" : "done" } }, { onSuccess: () => refetch() })}
                    className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded border", task.status === "done" ? "border-primary bg-primary text-white" : "border-slate-300 bg-white")}
                  >
                    {task.status === "done" ? "✓" : ""}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-semibold", task.status === "done" ? "text-muted line-through" : "text-ink")}>{task.title}</p>
                    <p className="text-[10px] text-muted">{task.description ?? "Sem descrição"}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={task.priority === "high" || task.priority === "urgent" ? "danger" : task.priority === "medium" ? "warning" : "neutral"}>{task.priority}</Badge>
                    <p className="mt-1 text-[10px] text-muted">{task.due_date ? formatDate(task.due_date) : "sem prazo"}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Clock className="size-4 text-primary" /> Linha do tempo</h2>
            <div className="mt-3 space-y-3">
              {customer.activities.length === 0 ? <p className="text-xs text-muted">Sem atividades registradas.</p> : customer.activities.slice(0, 12).map((activity) => (
                <div key={activity.id} className="flex gap-2.5">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-xs font-medium text-ink-soft">{activity.description}</p>
                    <p className="text-[10px] text-muted">{relativeTime(activity.created_at)} · {activity.activity_type}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card className="p-4">
            <div className="flex flex-col items-center text-center">
              <Avatar name={customer.name} size="xl" online />
              <p className="mt-2 font-display text-base font-bold text-ink">{customer.name}</p>
              <p className="text-xs text-muted">{customer.company ?? "Empresa não informada"}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {customer.tags.map((tag) => <Badge key={tag} variant="outline"><Tag className="size-2.5" /> {tag}</Badge>)}
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t border-line pt-3 text-xs">
              <p className="flex items-center gap-2 text-ink-soft"><Phone className="size-3.5 text-slate-400" /> {formatPhone(customer.phone)}</p>
              <p className="flex items-center gap-2 text-ink-soft"><Mail className="size-3.5 text-slate-400" /> {customer.email ?? "não informado"}</p>
              <p className="flex items-center gap-2 text-ink-soft"><Building2 className="size-3.5 text-slate-400" /> {customer.document ?? "documento não informado"}</p>
              <p className="flex items-start gap-2 text-ink-soft"><MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" /> {customer.address ?? "endereço não informado"}</p>
              <p className="flex items-center gap-2 text-ink-soft"><UserCheck className="size-3.5 text-slate-400" /> {customer.assigned_to_user.full_name}</p>
            </div>
            {customer.notes ? (
              <div className="mt-3 rounded-xl bg-surface-low p-2.5">
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted"><FileText className="size-3" /> Notas</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">{customer.notes}</p>
              </div>
            ) : null}
          </Card>

          <Card className="border-indigo-100 bg-gradient-to-br from-primary-soft/70 to-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Sparkles className="size-4 text-primary" /> Resumo Nexus AI</h2>
              {conversation ? <Badge variant="ai">Copiloto</Badge> : <Badge variant="outline">Sem conversa</Badge>}
            </div>
            {summary ? (
              <div className="mt-2.5 rounded-xl border border-indigo-100 bg-white p-3">
                <p className="whitespace-pre-line text-[11px] leading-relaxed text-ink-soft">{summary.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {summary.key_points.map((point) => <Badge key={point} variant="outline">{point}</Badge>)}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                {conversation
                  ? "Gere um resumo executivo da conversa com o cliente, incluindo a última solicitação e o próximo passo sugerido."
                  : "Este cliente ainda não tem conversa no WhatsApp. Inicie um atendimento para habilitar o resumo automático."}
              </p>
            )}
            <Button
              variant="ai"
              size="sm"
              className="mt-3 w-full"
              loading={summarize.isPending}
              disabled={!conversation}
              leftIcon={<Sparkles className="size-3.5" />}
              onClick={() => {
                if (!conversation) return;
                summarize.mutate(conversation.id, {
                  onSuccess: (result) => setSummary(result),
                  onError: () => toast("Não foi possível resumir a conversa.", "error"),
                });
              }}
            >
              {summary ? "Gerar novo resumo" : "Resumir conversa"}
            </Button>
          </Card>

          <Card className="p-4">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><CalendarClock className="size-4 text-primary" /> Próximos passos</h2>
            <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-ink-soft">
              <p>• Confirmar tomador de decisão e orçamento (BANT).</p>
              <p>• Revisar minuta contratual e cláusulas de LGPD.</p>
              <p>• Agendar demonstração técnica com o time de TI.</p>
            </div>
            <Button variant="secondary" size="sm" className="mt-3 w-full" leftIcon={<ArrowUpRight className="size-3.5" />} onClick={() => navigate("/pipeline")}>
              Abrir no pipeline
            </Button>
          </Card>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar cliente" footer={<><Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button><Button type="submit" form="edit-customer" loading={updateCustomer.isPending}>Guardar</Button></>}>
        <form id="edit-customer" onSubmit={saveEdit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" className="sm:col-span-2"><Input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} required /></Field>
          <Field label="Telefone"><Input value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} required /></Field>
          <Field label="E-mail"><Input type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} /></Field>
          <Field label="Empresa"><Input value={editForm.company} onChange={(event) => setEditForm({ ...editForm, company: event.target.value })} /></Field>
          <Field label="Tags"><Input value={editForm.tags} onChange={(event) => setEditForm({ ...editForm, tags: event.target.value })} placeholder="Enterprise, B2B" /></Field>
          <Field label="Notas" className="sm:col-span-2"><Textarea rows={3} value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} /></Field>
          {error ? <div className="sm:col-span-2 rounded-xl bg-danger-soft px-3 py-2 text-xs font-medium text-red-700">{error}</div> : null}
        </form>
      </Modal>

      <Modal open={dealOpen} onClose={() => setDealOpen(false)} title="Nova oportunidade" description={`Cliente: ${customer.name}`} footer={<><Button variant="secondary" onClick={() => setDealOpen(false)}>Cancelar</Button><Button type="submit" form="new-deal" loading={createDeal.isPending}>Criar oportunidade</Button></>}>
        <form id="new-deal" onSubmit={saveDeal} className="grid gap-3 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2"><Input value={dealForm.title} onChange={(event) => setDealForm({ ...dealForm, title: event.target.value })} required placeholder="Plano Enterprise Anual" /></Field>
          <Field label="Valor (R$)"><Input type="number" min="0" step="100" value={dealForm.value} onChange={(event) => setDealForm({ ...dealForm, value: event.target.value })} required placeholder="74000" /></Field>
          <Field label="Estágio">
            <Select value={dealForm.stage} onChange={(event) => setDealForm({ ...dealForm, stage: event.target.value })}>
              {["new_lead", "first_contact", "qualified", "proposal_sent", "negotiation", "won", "lost"].map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}
            </Select>
          </Field>
          <Field label="Probabilidade (%)"><Input type="number" min="0" max="100" value={dealForm.probability} onChange={(event) => setDealForm({ ...dealForm, probability: event.target.value })} /></Field>
          <Field label="Fecho previsto"><Input type="date" value={dealForm.expected_close_date} onChange={(event) => setDealForm({ ...dealForm, expected_close_date: event.target.value })} /></Field>
          {error ? <div className="sm:col-span-2 rounded-xl bg-danger-soft px-3 py-2 text-xs font-medium text-red-700">{error}</div> : null}
        </form>
      </Modal>

      <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title="Nova tarefa" description={`Cliente: ${customer.name}`} footer={<><Button variant="secondary" onClick={() => setTaskOpen(false)}>Cancelar</Button><Button type="submit" form="new-task" loading={createTask.isPending}>Criar tarefa</Button></>}>
        <form id="new-task" onSubmit={saveTask} className="grid gap-3 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2"><Input value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required placeholder="Enviar proposta comercial" /></Field>
          <Field label="Prioridade">
            <Select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>
              {["low", "medium", "high", "urgent"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </Select>
          </Field>
          <Field label="Prazo"><Input type="date" value={taskForm.due_date} onChange={(event) => setTaskForm({ ...taskForm, due_date: event.target.value })} /></Field>
          <Field label="Descrição" className="sm:col-span-2"><Textarea rows={3} value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} /></Field>
          {error ? <div className="sm:col-span-2 rounded-xl bg-danger-soft px-3 py-2 text-xs font-medium text-red-700">{error}</div> : null}
        </form>
      </Modal>
    </div>
  );
}
