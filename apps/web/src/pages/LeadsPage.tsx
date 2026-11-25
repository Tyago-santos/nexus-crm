import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, Filter, Plus, Search, Sparkles, Target, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useCreateDeal, useCreateLead, useCustomers, useLeads, useQualifyLead, useTeam, useUpdateLead } from "@/lib/queries";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Progress, Select, Skeleton, Tabs } from "@/components/ui";
import { cn, formatDate, formatPhone } from "@/lib/utils";
import { useToast } from "@/components/toast";
import type { QualifyResult } from "@/lib/types";

const statusTone: Record<string, "primary" | "success" | "warning" | "danger" | "neutral" | "ai"> = {
  new: "primary",
  contacted: "warning",
  qualified: "ai",
  converted: "success",
  lost: "neutral",
};

const statusLabel: Record<string, string> = {
  new: "Novo",
  contacted: "Contactado",
  qualified: "Qualificado",
  converted: "Convertido",
  lost: "Perdido",
};

export default function LeadsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: leads, isLoading } = useLeads();
  const { data: customers } = useCustomers("", "");
  const { can } = useAuth();
  const { data: team } = useTeam(can("team:manage"));
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const qualify = useQualifyLead();
  const createDeal = useCreateDeal();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [result, setResult] = useState<QualifyResult | null>(null);
  const [convertLeadId, setConvertLeadId] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_id: "", title: "", source: "WhatsApp", assigned_to: "" });
  const [dealForm, setDealForm] = useState({ title: "", value: "", probability: "55" });
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return (leads ?? [])
      .filter((lead) => (tab === "all" ? true : lead.status === tab))
      .filter((lead) =>
        term
          ? [lead.title, lead.customer?.name ?? "", lead.customer?.company ?? "", lead.source ?? ""].some((value) => value.toLowerCase().includes(term))
          : true,
      );
  }, [leads, tab, search]);

  const convertLead = leads?.find((lead) => lead.id === convertLeadId) ?? null;

  function submitLead(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    createLead.mutate(
      {
        customer_id: form.customer_id,
        title: form.title,
        source: form.source || undefined,
        ...(form.assigned_to ? { assigned_to: form.assigned_to } : {}),
      },
      {
        onSuccess: () => {
          toast("Lead criado com sucesso.");
          setNewOpen(false);
          setForm({ customer_id: "", title: "", source: "WhatsApp", assigned_to: "" });
        },
        onError: (cause) => setError(cause instanceof Error ? cause.message : "Não foi possível criar o lead."),
      },
    );
  }

  function submitDeal(event: React.FormEvent) {
    event.preventDefault();
    if (!convertLead) return;
    createDeal.mutate(
      {
        customer_id: convertLead.customer_id,
        lead_id: convertLead.id,
        title: dealForm.title,
        value: Number(dealForm.value) || 0,
        probability: Number(dealForm.probability) || 55,
        stage: "qualified",
      },
      {
        onSuccess: () => {
          updateLead.mutate({ id: convertLead.id, input: { status: "converted" } });
          toast("Oportunidade criada a partir do lead.");
          setConvertLeadId(null);
          setDealForm({ title: "", value: "", probability: "55" });
        },
        onError: (cause) => setError(cause instanceof Error ? cause.message : "Não foi possível converter o lead."),
      },
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Aquisição</span>}
        title="Leads"
        description="Capture, qualifique com IA e converta contactos em oportunidades reais de receita."
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={() => setNewOpen(true)}>Novo lead</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total de leads", value: leads?.length ?? 0, icon: Users, tone: "text-primary bg-primary-soft" },
          { label: "Novos", value: leads?.filter((lead) => lead.status === "new").length ?? 0, icon: UserPlus, tone: "text-sky-600 bg-sky-50" },
          { label: "Qualificados", value: leads?.filter((lead) => lead.status === "qualified").length ?? 0, icon: Sparkles, tone: "text-tertiary bg-tertiary-soft" },
          { label: "Convertidos", value: leads?.filter((lead) => lead.status === "converted").length ?? 0, icon: Target, tone: "text-secondary bg-secondary-soft" },
        ].map((item) => (
          <Card key={item.label} className="flex items-center gap-3 p-3.5">
            <span className={cn("grid size-9 place-items-center rounded-lg", item.tone)}><item.icon className="size-4" /></span>
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">{item.label}</p><p className="text-lg font-extrabold text-ink">{item.value}</p></div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            items={[
              { id: "all", label: "Todos", count: leads?.length ?? 0 },
              { id: "new", label: "Novos", count: leads?.filter((lead) => lead.status === "new").length },
              { id: "qualified", label: "Qualificados", count: leads?.filter((lead) => lead.status === "qualified").length },
              { id: "converted", label: "Convertidos", count: leads?.filter((lead) => lead.status === "converted").length },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar lead, cliente ou origem…" className="pl-9" />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14" />)}</div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface/60 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5">Lead</th>
                  <th className="px-3 py-2.5">Cliente</th>
                  <th className="px-3 py-2.5">Origem</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5">Responsável</th>
                  <th className="px-3 py-2.5">Criado</th>
                  <th className="px-4 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-line/70 last:border-0 hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-[10px] font-bold text-primary">{lead.title.slice(0, 2).toUpperCase()}</span>
                        <div>
                          <p className="text-sm font-bold text-ink">{lead.title}</p>
                          <p className="text-[10px] text-muted">{lead.source ?? "origem não informada"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {lead.customer ? (
                        <button type="button" onClick={() => navigate(`/clientes/${lead.customer?.id}`)} className="text-left">
                          <p className="text-xs font-semibold text-ink hover:text-primary">{lead.customer.name}</p>
                          <p className="text-[10px] text-muted">{lead.customer.company ?? formatPhone(lead.customer.phone)}</p>
                        </button>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3"><Badge variant="outline">{lead.source ?? "—"}</Badge></td>
                    <td className="px-3 py-3">
                      <Select
                        value={lead.status}
                        className="h-8 w-32 text-xs"
                        onChange={(event) => updateLead.mutate({ id: lead.id, input: { status: event.target.value } }, { onSuccess: () => toast("Estado do lead atualizado.") })}
                      >
                        {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </Select>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Avatar name={lead.assigned_to_user.full_name} size="xs" />
                        <span className="text-xs text-ink-soft">{lead.assigned_to_user.full_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted">{formatDate(lead.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ai"
                          size="sm"
                          loading={qualify.isPending && qualify.variables?.lead_id === lead.id}
                          leftIcon={<Sparkles className="size-3" />}
                          onClick={() => qualify.mutate({ lead_id: lead.id }, { onSuccess: (data) => setResult(data), onError: () => toast("Não foi possível qualificar o lead.", "error") })}
                        >
                          Qualificar IA
                        </Button>
                        {lead.status !== "converted" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setConvertLeadId(lead.id);
                              setDealForm({ title: lead.title, value: "", probability: "55" });
                            }}
                          >
                            Converter
                          </Button>
                        ) : (
                          <Badge variant="success"><CheckCircle2 className="size-3" /> Convertido</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6"><EmptyState icon={<Filter className="size-5" />} title="Nenhum lead encontrado" description="Crie um lead ou ajuste os filtros de estado e busca." /></div>
        )}
      </Card>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Novo lead" description="Vincule o lead a um cliente existente." footer={<><Button variant="secondary" onClick={() => setNewOpen(false)}>Cancelar</Button><Button type="submit" form="new-lead" loading={createLead.isPending}>Criar lead</Button></>}>
        <form id="new-lead" onSubmit={submitLead} className="grid gap-3 sm:grid-cols-2">
          <Field label="Cliente" className="sm:col-span-2">
            <Select value={form.customer_id} onChange={(event) => setForm({ ...form, customer_id: event.target.value })} required>
              <option value="">Selecione um cliente…</option>
              {(customers ?? []).map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.company ?? customer.phone}</option>)}
            </Select>
          </Field>
          <Field label="Título do lead" className="sm:col-span-2"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="Interesse em plano Enterprise" /></Field>
          <Field label="Origem"><Select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}>{["WhatsApp", "Site", "Indicação", "Evento", "Outbound", "Google Ads"].map((source) => <option key={source} value={source}>{source}</option>)}</Select></Field>
          {team && team.length > 0 ? (
            <Field label="Responsável"><Select value={form.assigned_to} onChange={(event) => setForm({ ...form, assigned_to: event.target.value })}><option value="">Atribuir a mim</option>{team.map((member) => <option key={member.user_id} value={member.user_id}>{member.user.full_name}</option>)}</Select></Field>
          ) : null}
          {error ? <div className="sm:col-span-2 rounded-xl bg-danger-soft px-3 py-2 text-xs font-medium text-red-700">{error}</div> : null}
        </form>
      </Modal>

      <Modal open={Boolean(result)} onClose={() => setResult(null)} title="Qualificação Nexus AI" description={result ? `${result.customer ?? "Lead"} · score ${result.score}/100` : undefined} footer={<Button variant="secondary" onClick={() => setResult(null)}>Fechar</Button>}>
        {result ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-indigo-100 bg-primary-soft/60 p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-ink"><span>Probabilidade de fechamento</span><span className="text-primary">{result.probability}%</span></div>
              <Progress value={result.probability} className="mt-2" tone="tertiary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Raciocínio do agente</p>
              <ul className="mt-1.5 space-y-1.5 text-xs text-ink-soft">{result.reasoning.map((item) => <li key={item} className="rounded-lg bg-surface px-2.5 py-1.5">{item}</li>)}</ul>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Próximos passos</p>
              <ul className="mt-1.5 space-y-1 text-xs text-ink-soft">{result.next_steps.map((item) => <li key={item}>• {item}</li>)}</ul>
            </div>
            <p className="text-[10px] text-muted">Tarefa de follow-up criada automaticamente. A IA usa apenas ferramentas autorizadas — sem SQL livre.</p>
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(convertLead)} onClose={() => setConvertLeadId(null)} title="Converter lead em oportunidade" description={convertLead ? `${convertLead.title} · ${convertLead.customer?.name ?? ""}` : undefined} footer={<><Button variant="secondary" onClick={() => setConvertLeadId(null)}>Cancelar</Button><Button type="submit" form="convert-lead" loading={createDeal.isPending} leftIcon={<ArrowUpRight className="size-3.5" />}>Criar oportunidade</Button></>}>
        <form id="convert-lead" onSubmit={submitDeal} className="grid gap-3 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2"><Input value={dealForm.title} onChange={(event) => setDealForm({ ...dealForm, title: event.target.value })} required /></Field>
          <Field label="Valor (R$)"><Input type="number" min="0" value={dealForm.value} onChange={(event) => setDealForm({ ...dealForm, value: event.target.value })} required /></Field>
          <Field label="Probabilidade (%)"><Input type="number" min="0" max="100" value={dealForm.probability} onChange={(event) => setDealForm({ ...dealForm, probability: event.target.value })} /></Field>
          {error ? <div className="sm:col-span-2 rounded-xl bg-danger-soft px-3 py-2 text-xs font-medium text-red-700">{error}</div> : null}
        </form>
      </Modal>
    </div>
  );
}
