import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CalendarClock, CheckCircle2, CheckSquare, Clock, Filter, Plus, Search, UserRound } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useCreateTask, useCustomers, useTasks, useTeam, useUpdateTask } from "@/lib/queries";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, Tabs, Textarea } from "@/components/ui";
import { cn, formatDate, relativeTime } from "@/lib/utils";
import { useToast } from "@/components/toast";

const priorityTone: Record<string, "danger" | "warning" | "neutral" | "outline"> = {
  urgent: "danger",
  high: "danger",
  medium: "warning",
  low: "neutral",
};

const priorityLabel: Record<string, string> = { urgent: "Urgente", high: "Alta", medium: "Média", low: "Baixa" };

export default function TasksPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const { can } = useAuth();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [open, setOpen] = useState(params.get("nova") === "1");
  const { data: tasks, isLoading } = useTasks(tab === "all" ? "" : tab);
  const { data: customers } = useCustomers("", "");
  const { data: team } = useTeam(can("team:manage"));
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_date: "", customer_id: "", assigned_to: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("nova") === "1") setOpen(true);
  }, [params]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return (tasks ?? [])
      .filter((task) => (priority ? task.priority === priority : true))
      .filter((task) => (term ? [task.title, task.description ?? "", task.customer?.name ?? "", task.assigned_to_user.full_name].some((value) => value.toLowerCase().includes(term)) : true));
  }, [tasks, search, priority]);

  const groups = useMemo(() => {
    const now = Date.now();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const overdue: typeof filtered = [];
    const today: typeof filtered = [];
    const upcoming: typeof filtered = [];
    const noDate: typeof filtered = [];
    filtered.forEach((task) => {
      if (!task.due_date) return noDate.push(task);
      const due = new Date(task.due_date).getTime();
      if (due < now && task.status !== "done" && task.status !== "cancelled") return overdue.push(task);
      if (due <= endOfToday.getTime()) return today.push(task);
      return upcoming.push(task);
    });
    return [
      { id: "overdue", label: "Atrasadas", tasks: overdue, tone: "text-danger" },
      { id: "today", label: "Hoje", tasks: today, tone: "text-warning" },
      { id: "upcoming", label: "Próximas", tasks: upcoming, tone: "text-primary" },
      { id: "no-date", label: "Sem prazo", tasks: noDate, tone: "text-muted" },
    ].filter((group) => group.tasks.length > 0);
  }, [filtered]);

  function closeModal() {
    setOpen(false);
    setError(null);
    if (params.get("nova")) {
      params.delete("nova");
      setParams(params, { replace: true });
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    createTask.mutate(
      {
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        ...(form.customer_id ? { customer_id: form.customer_id } : {}),
        ...(form.due_date ? { due_date: new Date(form.due_date).toISOString() } : {}),
        ...(form.assigned_to ? { assigned_to: form.assigned_to } : {}),
      },
      {
        onSuccess: () => {
          toast("Tarefa criada.");
          closeModal();
          setForm({ title: "", description: "", priority: "medium", due_date: "", customer_id: "", assigned_to: "" });
        },
        onError: (cause) => setError(cause instanceof Error ? cause.message : "Não foi possível criar a tarefa."),
      },
    );
  }

  const pendingCount = (tasks ?? []).filter((task) => task.status === "pending").length;

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Operação</span>}
        title="Tarefas"
        description="Organize follow-ups, onboarding e atividades da equipa. Tarefas criadas pela IA aparecem aqui automaticamente."
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Nova tarefa</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-3 p-3.5"><span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary"><CheckSquare className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Pendentes</p><p className="text-lg font-extrabold text-ink">{pendingCount}</p></div></Card>
        <Card className="flex items-center gap-3 p-3.5"><span className="grid size-9 place-items-center rounded-lg bg-danger-soft text-danger"><AlertCircle className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Atrasadas</p><p className="text-lg font-extrabold text-ink">{groups.find((group) => group.id === "overdue")?.tasks.length ?? 0}</p></div></Card>
        <Card className="flex items-center gap-3 p-3.5"><span className="grid size-9 place-items-center rounded-lg bg-secondary-soft text-secondary"><CheckCircle2 className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Concluídas</p><p className="text-lg font-extrabold text-ink">{(tasks ?? []).filter((task) => task.status === "done").length}</p></div></Card>
        <Card className="flex items-center gap-3 p-3.5"><span className="grid size-9 place-items-center rounded-lg bg-tertiary-soft text-tertiary"><UserRound className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Atribuídas a mim</p><p className="text-lg font-extrabold text-ink">{(tasks ?? []).filter((task) => task.assigned_to_user.id && task.status !== "done").length}</p></div></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            items={[
              { id: "all", label: "Todas" },
              { id: "pending", label: "Pendentes" },
              { id: "in_progress", label: "Em curso" },
              { id: "done", label: "Concluídas" },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="flex items-center gap-2">
            <div className="relative w-full lg:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tarefa ou cliente…" className="pl-9" />
            </div>
            <Select value={priority} onChange={(event) => setPriority(event.target.value)} className="w-36">
              <option value="">Prioridade</option>
              {Object.entries(priorityLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-14" />)}</div>
        ) : groups.length === 0 ? (
          <div className="p-6"><EmptyState icon={<Filter className="size-5" />} title="Nenhuma tarefa encontrada" description="Crie uma tarefa ou ajuste os filtros aplicados." action={<Button size="sm" leftIcon={<Plus className="size-3.5" />} onClick={() => setOpen(true)}>Nova tarefa</Button>} /></div>
        ) : (
          <div className="divide-y divide-line">
            {groups.map((group) => (
              <div key={group.id} className="p-3">
                <p className={cn("mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide", group.tone)}>
                  <CalendarClock className="size-3" /> {group.label} <span className="text-muted">({group.tasks.length})</span>
                </p>
                <div className="space-y-1.5">
                  {group.tasks.map((task) => (
                    <div key={task.id} className={cn("flex items-start gap-2.5 rounded-xl border p-2.5 transition", task.status === "done" ? "border-line bg-surface/40" : "border-line bg-white hover:border-primary/30")}>
                      <button
                        type="button"
                        aria-label="Alternar conclusão"
                        onClick={() =>
                          updateTask.mutate(
                            { id: task.id, input: { status: task.status === "done" ? "pending" : "done" } },
                            { onSuccess: () => toast(task.status === "done" ? "Tarefa reaberta." : "Tarefa concluída.") },
                          )
                        }
                        className={cn("mt-0.5 grid size-4.5 shrink-0 place-items-center rounded border text-[10px]", task.status === "done" ? "border-primary bg-primary text-white" : "border-slate-300 bg-white hover:border-primary")}
                      >
                        {task.status === "done" ? "✓" : ""}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className={cn("text-xs font-bold", task.status === "done" ? "text-muted line-through" : "text-ink")}>{task.title}</p>
                          <Badge variant={priorityTone[task.priority] ?? "neutral"}>{priorityLabel[task.priority] ?? task.priority}</Badge>
                          {task.status === "in_progress" ? <Badge variant="warning">Em curso</Badge> : null}
                        </div>
                        {task.description ? <p className="mt-0.5 line-clamp-1 text-[10px] text-muted">{task.description}</p> : null}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                          {task.customer ? (
                            <button type="button" onClick={() => navigate(`/clientes/${task.customer?.id}`)} className="font-semibold text-primary hover:underline">{task.customer.name}</button>
                          ) : <span>Sem cliente</span>}
                          <span className="flex items-center gap-0.5"><Clock className="size-2.5" /> {task.due_date ? relativeTime(task.due_date) : "sem prazo"}</span>
                          <span className="flex items-center gap-1"><Avatar name={task.assigned_to_user.full_name} size="xs" /> {task.assigned_to_user.full_name.split(" ")[0]}</span>
                        </div>
                      </div>
                      <Select
                        value={task.status}
                        onChange={(event) => updateTask.mutate({ id: task.id, input: { status: event.target.value } }, { onSuccess: () => toast("Estado atualizado.") })}
                        className="h-7 w-28 shrink-0 text-[10px]"
                      >
                        <option value="pending">Pendente</option>
                        <option value="in_progress">Em curso</option>
                        <option value="done">Concluída</option>
                        <option value="cancelled">Cancelada</option>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={closeModal} title="Nova tarefa" description="Vincule a tarefa a um cliente para manter o histórico completo." footer={<><Button variant="secondary" onClick={closeModal}>Cancelar</Button><Button type="submit" form="new-task" loading={createTask.isPending}>Criar tarefa</Button></>}>
        <form id="new-task" onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="Enviar proposta comercial" /></Field>
          <Field label="Cliente">
            <Select value={form.customer_id} onChange={(event) => setForm({ ...form, customer_id: event.target.value })}>
              <option value="">Sem cliente</option>
              {(customers ?? []).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </Select>
          </Field>
          <Field label="Prioridade">
            <Select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
              {Object.entries(priorityLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
          <Field label="Prazo"><Input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} /></Field>
          {team && team.length > 0 ? (
            <Field label="Responsável">
              <Select value={form.assigned_to} onChange={(event) => setForm({ ...form, assigned_to: event.target.value })}>
                <option value="">Atribuir a mim</option>
                {team.map((member) => <option key={member.user_id} value={member.user_id}>{member.user.full_name}</option>)}
              </Select>
            </Field>
          ) : null}
          <Field label="Descrição" className="sm:col-span-2"><Textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Detalhes, checklist ou contexto…" /></Field>
          {error ? <div className="sm:col-span-2 rounded-xl bg-danger-soft px-3 py-2 text-xs font-medium text-red-700">{error}</div> : null}
        </form>
      </Modal>
    </div>
  );
}
