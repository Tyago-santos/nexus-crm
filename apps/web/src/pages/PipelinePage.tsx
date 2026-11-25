import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, CircleDollarSign, Filter, Flame, GripVertical, Plus, Search, Sparkles, Target, Trophy } from "lucide-react";
import { useCreateDeal, useCustomers, useDeals, useUpdateDeal } from "@/lib/queries";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton } from "@/components/ui";
import { DEAL_STAGES, cn, formatCompactCurrency, formatCurrency, formatDate, stageLabel } from "@/lib/utils";
import { useToast } from "@/components/toast";
import type { DealWithMeta } from "@/lib/types";

const stages = DEAL_STAGES.filter((stage) => stage.id !== "lost");
const stageBadgeTone: Record<string, "primary" | "success" | "warning" | "neutral" | "ai"> = {
  new_lead: "primary",
  first_contact: "primary",
  qualified: "ai",
  proposal_sent: "warning",
  negotiation: "warning",
  won: "success",
};

export default function PipelinePage() {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const { data: deals, isLoading } = useDeals();
  const { data: customers } = useCustomers("", "");
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("");
  const [open, setOpen] = useState(params.get("novo") === "1");
  const [selected, setSelected] = useState<DealWithMeta | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_id: "", title: "", value: "", stage: "new_lead", probability: "45", expected_close_date: "" });
  const [editForm, setEditForm] = useState({ title: "", value: "", stage: "new_lead", probability: "45", expected_close_date: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("novo") === "1") setOpen(true);
  }, [params]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return (deals ?? []).filter((deal) => {
      if (owner && deal.assigned_to !== owner) return false;
      if (!term) return true;
      return [deal.title, deal.customer?.name ?? "", deal.customer?.company ?? "", deal.assigned_to_user.full_name].some((value) =>
        value.toLowerCase().includes(term),
      );
    });
  }, [deals, search, owner]);

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    (deals ?? []).forEach((deal) => {
      if (deal.assigned_to) map.set(deal.assigned_to, deal.assigned_to_user.full_name);
    });
    return [...map.entries()];
  }, [deals]);

  const openDeals = filtered.filter((deal) => !["won", "lost"].includes(deal.stage));
  const openValue = openDeals.reduce((sum, deal) => sum + deal.value, 0);
  const weighted = openDeals.reduce((sum, deal) => sum + deal.value * (deal.probability / 100), 0);
  const wonValue = filtered.filter((deal) => deal.stage === "won").reduce((sum, deal) => sum + deal.value, 0);
  const lost = filtered.filter((deal) => deal.stage === "lost");

  function closeModal() {
    setOpen(false);
    setError(null);
    if (params.get("novo")) {
      params.delete("novo");
      setParams(params, { replace: true });
    }
  }

  function submitDeal(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    createDeal.mutate(
      {
        customer_id: form.customer_id,
        title: form.title,
        value: Number(form.value) || 0,
        stage: form.stage,
        probability: Number(form.probability) || 20,
        ...(form.expected_close_date ? { expected_close_date: new Date(form.expected_close_date).toISOString() } : {}),
      },
      {
        onSuccess: () => {
          toast("Oportunidade adicionada ao pipeline.");
          closeModal();
          setForm({ customer_id: "", title: "", value: "", stage: "new_lead", probability: "45", expected_close_date: "" });
        },
        onError: (cause) => setError(cause instanceof Error ? cause.message : "Não foi possível criar a oportunidade."),
      },
    );
  }

  function moveDeal(dealId: string, stage: string) {
    const deal = deals?.find((item) => item.id === dealId);
    if (!deal || deal.stage === stage) return;
    updateDeal.mutate(
      { id: dealId, input: { stage, probability: stage === "won" ? 100 : deal.probability } },
      {
        onSuccess: () => {
          toast(`"${deal.title}" movida para ${stageLabel(stage)}.`, "info");
          if (stage === "won") toast("Automação disparada: tarefa de onboarding criada.");
        },
        onError: () => toast("Não foi possível mover a oportunidade.", "error"),
      },
    );
  }

  function openDeal(deal: DealWithMeta) {
    setSelected(deal);
    setEditForm({
      title: deal.title,
      value: String(deal.value),
      stage: deal.stage,
      probability: String(deal.probability),
      expected_close_date: deal.expected_close_date ? deal.expected_close_date.slice(0, 10) : "",
    });
  }

  function saveDeal(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    updateDeal.mutate(
      {
        id: selected.id,
        input: {
          title: editForm.title,
          value: Number(editForm.value) || 0,
          stage: editForm.stage,
          probability: Number(editForm.probability) || 0,
          expected_close_date: editForm.expected_close_date ? new Date(editForm.expected_close_date).toISOString() : null,
        },
      },
      {
        onSuccess: (deal) => {
          toast("Oportunidade atualizada.");
          setSelected((current) => (current ? ({ ...current, ...deal } as DealWithMeta) : current));
          if (editForm.stage === "won") toast("Automação disparada: onboarding criado.");
        },
        onError: () => toast("Não foi possível atualizar a oportunidade.", "error"),
      },
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Receita</span>}
        title="Pipeline de Vendas"
        description="Arraste os cartões entre estágios. A IA recalcula a previsão ponderada e dispara automações ao ganhar."
        actions={
          <>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-secondary-soft px-3 py-2 text-xs font-semibold text-emerald-700">
              <Trophy className="size-3.5" /> Ganho: {formatCurrency(wonValue)}
            </div>
            <Button leftIcon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Nova oportunidade</Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-3 p-3.5"><span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary"><Target className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Pipeline aberto</p><p className="text-lg font-extrabold text-ink">{formatCompactCurrency(openValue)}</p></div></Card>
        <Card className="flex items-center gap-3 p-3.5"><span className="grid size-9 place-items-center rounded-lg bg-tertiary-soft text-tertiary"><Sparkles className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Previsão ponderada</p><p className="text-lg font-extrabold text-ink">{formatCompactCurrency(weighted)}</p></div></Card>
        <Card className="flex items-center gap-3 p-3.5"><span className="grid size-9 place-items-center rounded-lg bg-secondary-soft text-secondary"><CircleDollarSign className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Oportunidades ativas</p><p className="text-lg font-extrabold text-ink">{openDeals.length}</p></div></Card>
        <Card className="flex items-center gap-3 p-3.5"><span className="grid size-9 place-items-center rounded-lg bg-warning-soft text-warning"><Flame className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Taxa média</p><p className="text-lg font-extrabold text-ink">{openDeals.length ? Math.round(openDeals.reduce((sum, deal) => sum + deal.probability, 0) / openDeals.length) : 0}%</p></div></Card>
      </div>

      <Card className="mb-4 flex flex-col gap-2 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar oportunidade, cliente ou responsável…" className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted" />
          <Select value={owner} onChange={(event) => setOwner(event.target.value)} className="w-52">
            <option value="">Todos os responsáveis</option>
            {owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </Select>
          <Badge variant="outline">{filtered.length} oportunidades</Badge>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-72" />)}</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3">
          {stages.map((stage) => {
            const colDeals = filtered.filter((deal) => deal.stage === stage.id);
            const total = colDeals.reduce((sum, deal) => sum + deal.value, 0);
            return (
              <div
                key={stage.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(stage.id);
                }}
                onDragLeave={() => setDragOver((current) => (current === stage.id ? null : current))}
                onDrop={(event) => {
                  event.preventDefault();
                  const dealId = event.dataTransfer.getData("text/deal") || dragging;
                  if (dealId) moveDeal(dealId, stage.id);
                  setDragging(null);
                  setDragOver(null);
                }}
                className={cn(
                  "flex w-[272px] shrink-0 flex-col rounded-xl border bg-surface-low/40 transition",
                  dragOver === stage.id ? "border-primary/50 bg-primary-soft/50" : "border-line",
                )}
              >
                <div className="p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      <p className="text-[11px] font-bold text-ink">{stage.label}</p>
                      <span className="rounded-full bg-white px-1.5 text-[10px] font-bold text-muted">{colDeals.length}</span>
                    </div>
                    <button type="button" aria-label={`Nova oportunidade em ${stage.label}`} onClick={() => { setOpen(true); setForm((current) => ({ ...current, stage: stage.id })); }} className="rounded p-1 text-muted hover:bg-white hover:text-primary">
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <p className="mt-0.5 text-[10px] font-semibold text-muted">{formatCompactCurrency(total)}</p>
                </div>

                <div className="flex-1 space-y-2 px-2.5 pb-3">
                  {colDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(event) => {
                        setDragging(deal.id);
                        event.dataTransfer.setData("text/deal", deal.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => openDeal(deal)}
                      className={cn(
                        "group cursor-grab rounded-lg border border-line bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:cursor-grabbing",
                        dragging === deal.id && "opacity-50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="line-clamp-2 text-xs font-bold leading-snug text-ink">{deal.title}</p>
                        <GripVertical className="mt-0.5 size-3.5 shrink-0 text-slate-300 group-hover:text-slate-400" />
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-muted">{deal.customer?.name ?? "Cliente"}{deal.customer?.company ? ` · ${deal.customer.company}` : ""}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-ink">{formatCompactCurrency(deal.value)}</span>
                        <span className="text-[10px] font-bold text-primary">{deal.probability}%</span>
                      </div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-high">
                        <div className="h-full rounded-full" style={{ width: `${deal.probability}%`, backgroundColor: stage.color }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Avatar name={deal.assigned_to_user.full_name} size="xs" />
                          <span className="max-w-24 truncate text-[9px] text-muted">{deal.assigned_to_user.full_name.split(" ")[0]}</span>
                        </div>
                        {deal.expected_close_date ? (
                          <span className="flex items-center gap-0.5 text-[9px] text-muted"><CalendarClock className="size-2.5" />{formatDate(deal.expected_close_date)}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {colDeals.length === 0 ? <div className="rounded-lg border border-dashed border-line/80 px-2 py-6 text-center text-[10px] text-slate-400">Solte um cartão aqui</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lost.length > 0 ? (
        <Card className="mt-2 p-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-bold text-ink"><span className="size-2 rounded-full bg-slate-400" /> Perdidos</p>
            <Badge variant="neutral">{lost.length} · {formatCompactCurrency(lost.reduce((sum, deal) => sum + deal.value, 0))}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {lost.map((deal) => (
              <button key={deal.id} type="button" onClick={() => openDeal(deal)} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-left text-[11px] transition hover:border-slate-300">
                <span className="font-semibold text-ink-soft">{deal.title}</span>
                <span className="ml-1 text-muted">{formatCompactCurrency(deal.value)}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <Modal open={open} onClose={closeModal} title="Nova oportunidade" description="A oportunidade entra no pipeline e fica visível para toda a equipa." footer={<><Button variant="secondary" onClick={closeModal}>Cancelar</Button><Button type="submit" form="new-deal" loading={createDeal.isPending}>Adicionar ao pipeline</Button></>}>
        <form id="new-deal" onSubmit={submitDeal} className="grid gap-3 sm:grid-cols-2">
          <Field label="Cliente" className="sm:col-span-2">
            <Select value={form.customer_id} onChange={(event) => setForm({ ...form, customer_id: event.target.value })} required>
              <option value="">Selecione um cliente…</option>
              {(customers ?? []).map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.company ?? customer.phone}</option>)}
            </Select>
          </Field>
          <Field label="Título" className="sm:col-span-2"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="Plano Enterprise Anual" /></Field>
          <Field label="Valor (R$)"><Input type="number" min="0" step="100" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} required placeholder="74000" /></Field>
          <Field label="Estágio"><Select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</Select></Field>
          <Field label="Probabilidade (%)"><Input type="number" min="0" max="100" value={form.probability} onChange={(event) => setForm({ ...form, probability: event.target.value })} /></Field>
          <Field label="Fecho previsto"><Input type="date" value={form.expected_close_date} onChange={(event) => setForm({ ...form, expected_close_date: event.target.value })} /></Field>
          {error ? <div className="sm:col-span-2 rounded-xl bg-danger-soft px-3 py-2 text-xs font-medium text-red-700">{error}</div> : null}
        </form>
      </Modal>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title ?? "Oportunidade"} description={selected ? `${selected.customer?.name ?? ""} · ${formatCurrency(selected.value)}` : undefined} footer={<><Button variant="secondary" onClick={() => setSelected(null)}>Fechar</Button><Button type="submit" form="edit-deal" loading={updateDeal.isPending}>Guardar alterações</Button></>}>
        {selected ? (
          <form id="edit-deal" onSubmit={saveDeal} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-surface p-2.5">
              <Avatar name={selected.assigned_to_user.full_name} size="sm" />
              <div className="flex-1"><p className="text-xs font-bold text-ink">{selected.assigned_to_user.full_name}</p><p className="text-[10px] text-muted">Responsável comercial</p></div>
              <Badge variant={stageBadgeTone[editForm.stage] ?? "neutral"}>{stageLabel(editForm.stage)}</Badge>
            </div>
            <Field label="Título" className="sm:col-span-2"><Input value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} required /></Field>
            <Field label="Valor (R$)"><Input type="number" min="0" value={editForm.value} onChange={(event) => setEditForm({ ...editForm, value: event.target.value })} required /></Field>
            <Field label="Probabilidade (%)"><Input type="number" min="0" max="100" value={editForm.probability} onChange={(event) => setEditForm({ ...editForm, probability: event.target.value })} /></Field>
            <Field label="Estágio"><Select value={editForm.stage} onChange={(event) => setEditForm({ ...editForm, stage: event.target.value })}>{DEAL_STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</Select></Field>
            <Field label="Fecho previsto"><Input type="date" value={editForm.expected_close_date} onChange={(event) => setEditForm({ ...editForm, expected_close_date: event.target.value })} /></Field>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
