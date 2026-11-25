import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  CircleDollarSign,
  Download,
  Eye,
  Flame,
  MessageCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { useDashboard, useDeals, useUpdateTask } from "@/lib/queries";
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Button, Card, PageHeader, Progress, Skeleton, StatCard, EmptyState } from "@/components/ui";
import { cn, formatCompactCurrency, formatCurrency, relativeTime, stageLabel } from "@/lib/utils";
import { useToast } from "@/components/toast";

const severityStyle: Record<string, { badge: "danger" | "warning" | "success" | "ai"; icon: typeof AlertTriangle; label: string }> = {
  high: { badge: "danger", icon: AlertTriangle, label: "Urgência Alta" },
  warning: { badge: "warning", icon: AlertTriangle, label: "Atenção" },
  positive: { badge: "success", icon: TrendingUp, label: "Oportunidade" },
  ai: { badge: "ai", icon: Sparkles, label: "Nexus IA" },
  low: { badge: "success", icon: TrendingUp, label: "Tudo em dia" },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error } = useDashboard();
  const { data: deals } = useDeals();
  const updateTask = useUpdateTask();
  const [period, setPeriod] = useState("30");

  const hotDeals = useMemo(
    () =>
      [...(deals ?? [])]
        .filter((deal) => !["won", "lost"].includes(deal.stage))
        .sort((a, b) => b.value * (b.probability / 100) - a.value * (a.probability / 100))
        .slice(0, 4),
    [deals],
  );

  const funnelMax = Math.max(1, ...(data?.funnel.map((stage) => stage.count) ?? [1]));
  const averageTicket = data && data.won_deals > 0 ? Math.round(data.revenue / data.won_deals) : 0;

  function exportCsv() {
    if (!data) return;
    const rows = [
      ["Mês", "Meta", "Realizado"],
      ...data.sales_by_month.map((month) => [month.month, String(month.meta), String(month.realizado)]),
    ];
    const csv = rows.map((row) => row.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nexus-relatorio-dashboard.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast("Relatório exportado em CSV.");
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={
          <>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Executive Pulse</span>
            <Badge variant="success">
              <span className="size-1.5 rounded-full bg-secondary" /> Sincronizado agora
            </Badge>
          </>
        }
        title="Visão Geral do Negócio"
        description="Acompanhe métricas de conversão em tempo real, receita mensal e recomendações ativas da IA Nexus."
        actions={
          <>
            <div className="flex rounded-lg border border-line bg-white p-0.5">
              {[
                { id: "30", label: "Últimos 30 dias" },
                { id: "90", label: "Este trimestre" },
                { id: "custom", label: "Personalizado" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPeriod(item.id);
                    toast(item.id === "custom" ? "Periodicidade personalizada em breve." : "Período atualizado.", "info");
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs font-semibold transition",
                    period === item.id ? "bg-primary text-white" : "text-muted hover:text-ink",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="md" leftIcon={<Download className="size-3.5" />} onClick={exportCsv}>
              Exportar Relatório
            </Button>
            <Button variant="secondary" size="icon" aria-label="Atualizar" onClick={() => window.location.reload()}>
              <RefreshCw className="size-3.5" />
            </Button>
          </>
        }
      />

      {error ? (
        <Card className="p-6">
          <EmptyState
            icon={<Sparkles className="size-5" />}
            title="Dashboard indisponível para o seu papel"
            description="O seu perfil não tem permissão de relatórios. Use o WhatsApp ou o pipeline para continuar a operar."
            action={<Button onClick={() => navigate("/whatsapp")}>Ir para o WhatsApp</Button>}
          />
        </Card>
      ) : isLoading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label="Receita Mensal (MRR)"
              value={formatCurrency(data.revenue)}
              icon={<CircleDollarSign className="size-4" />}
              trend={{ value: "↑ +14,2%" }}
              hint="vs. mês anterior"
            />
            <StatCard label="Total de Clientes" value={data.customers.toLocaleString("pt-BR")} icon={<Users className="size-4" />} tone="info" trend={{ value: "+38 novos" }} hint="98,4% ativos" />
            <StatCard label="Novos Leads" value={data.new_leads.toLocaleString("pt-BR")} icon={<UserPlus className="size-4" />} tone="tertiary" hint="78% qualificados" />
            <StatCard label="Vendas Realizadas" value={data.won_deals} icon={<Target className="size-4" />} tone="success" trend={{ value: "↑ +18,6%" }} hint="concluídas" />
            <StatCard label="Taxa de Conversão" value={`${data.conversion_rate.toLocaleString("pt-BR")}%`} icon={<TrendingUp className="size-4" />} tone="warning" hint="Meta: 22% · acima da meta" />
          </div>

          <Card className="mt-4 overflow-hidden border-indigo-100 bg-gradient-to-br from-primary-soft/70 via-white to-tertiary-soft/40 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-primary text-white shadow-sm">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-sm font-bold text-ink">Insights &amp; Recomendações da IA Nexus</h2>
                    <Badge variant="ai">Nexus Intelligence</Badge>
                  </div>
                  <p className="text-xs text-muted">3 ações prioritárias detectadas com potencial de impacto de R$ 125.000 no pipeline esta semana.</p>
                </div>
              </div>
              <span className="hidden items-center gap-1.5 text-[11px] font-semibold text-muted sm:flex">
                Modo Preditivo Ativo <span className="size-2 rounded-full bg-secondary animate-pulse-dot" />
              </span>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {data.insights.slice(0, 3).map((insight, index) => {
                const style = severityStyle[insight.severity] ?? severityStyle["ai"];
                const Icon = style?.icon ?? Sparkles;
                return (
                  <div key={insight.id} className="flex flex-col rounded-lg border border-line bg-white p-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={style?.badge ?? "ai"}>
                        <Icon className="size-3" /> {style?.label}
                      </Badge>
                      <span className="text-[10px] font-semibold text-muted">
                        {index === 0 ? "WhatsApp Bot" : index === 1 ? "+32% Eficiência" : "94% Win Rate"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold leading-snug text-ink">{insight.title}</p>
                    <p className="mt-1 line-clamp-3 flex-1 text-xs leading-relaxed text-muted">{insight.description}</p>
                    <Button
                      variant={index === 0 ? "primary" : "secondary"}
                      size="sm"
                      className="mt-3 w-full"
                      leftIcon={index === 0 ? <ArrowRight className="size-3.5" /> : index === 1 ? <Zap className="size-3.5" /> : <Eye className="size-3.5" />}
                      onClick={() => navigate(index === 0 ? "/whatsapp" : index === 1 ? "/automacoes" : "/pipeline")}
                    >
                      {index === 0 ? "Enviar Follow-up Sugerido" : index === 1 ? "Aplicar Automação" : "Ver Oportunidade"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <Card className="p-4 lg:col-span-7">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-ink">Desempenho de Vendas</h2>
                  <p className="text-xs text-muted">Comparativo semanal: Meta estabelecida vs. Receita Realizada.</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-semibold text-muted">
                  <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-indigo-200" /> Meta</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-primary" /> Realizado</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 divide-x divide-line rounded-lg bg-surface-low/70 p-3">
                <div className="px-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Ticket Médio</p>
                  <p className="mt-0.5 text-sm font-extrabold text-ink">{formatCompactCurrency(averageTicket)}</p>
                </div>
                <div className="px-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Meta do Mês</p>
                  <p className="mt-0.5 text-sm font-extrabold text-ink">{formatCompactCurrency(170000)}</p>
                </div>
                <div className="px-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Atingimento</p>
                  <p className="mt-0.5 text-sm font-extrabold text-secondary">{Math.round((data.revenue / 170000) * 100)}%</p>
                </div>
              </div>

              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.sales_by_month} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="realizadoGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e8edf7" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(value: number) => `${Math.round(value / 1000)}k`} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                      formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name === "meta" ? "Meta" : "Realizado"]}
                    />
                    <Bar dataKey="meta" fill="#e0e7ff" radius={[6, 6, 0, 0]} barSize={26} />
                    <Area type="monotone" dataKey="realizado" stroke="#4f46e5" strokeWidth={2.5} fill="url(#realizadoGradient)" dot={{ r: 3.5, fill: "#4f46e5" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-line pt-3 text-[11px]">
                <span className="text-muted">Projeção de fechamento do próximo mês: <strong className="text-ink">{formatCompactCurrency(data.revenue * 1.14)}</strong></span>
                <button type="button" onClick={() => navigate("/relatorios")} className="font-bold text-primary hover:underline">
                  Ver detalhes analíticos
                </button>
              </div>
            </Card>

            <Card className="p-4 lg:col-span-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-ink">Conversão do Funil</h2>
                  <p className="text-xs text-muted">Taxa de passagem entre estágios do ciclo comercial.</p>
                </div>
                <Badge variant="success">Funil Saudável</Badge>
              </div>

              <div className="mt-4 space-y-3">
                {data.funnel
                  .filter((stage) => stage.stage !== "lost")
                  .map((stage, index) => {
                    const count = stage.count;
                    const total = data.funnel.find((item) => item.stage === "new_lead")?.count ?? 1;
                    const percent = total > 0 ? Math.round((count / Math.max(total, 1)) * 100) : 0;
                    return (
                      <div key={stage.stage}>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1.5 font-semibold text-ink-soft">
                            <span className="grid size-4 place-items-center rounded-full bg-primary-soft text-[9px] font-bold text-primary">{index + 1}</span>
                            {stageLabel(stage.stage)}
                          </span>
                          <span className="text-muted">
                            <strong className="text-ink">{count}</strong> · {percent}% · {formatCompactCurrency(stage.value)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-high">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(4, (count / funnelMax) * 100)}%`,
                              backgroundColor: ["#312e81", "#4338ca", "#4f46e5", "#7c3aed", "#10b981"][index] ?? "#4f46e5",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-low/80 p-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-white text-primary">
                    <CalendarDays className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-ink">Tempo Médio de Ciclo</p>
                    <p className="text-[10px] text-muted">Redução de 3,2 dias com IA</p>
                  </div>
                </div>
                <Badge variant="success">Rápido</Badge>
              </div>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <Card className="p-4 lg:col-span-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
                  <Flame className="size-4 text-orange-500" /> Oportunidades Quentes
                </h2>
                <Badge variant="outline">Top 4 Fechamentos</Badge>
              </div>
              <div className="mt-3 space-y-1.5">
                {hotDeals.map((deal) => (
                  <button
                    key={deal.id}
                    type="button"
                    onClick={() => navigate("/pipeline")}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left transition hover:border-line hover:bg-surface-low/60"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                      {deal.customer?.name.slice(0, 2).toUpperCase() ?? "NX"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-ink">{deal.title}</p>
                      <p className="truncate text-[10px] text-muted">
                        {deal.assigned_to_user.full_name} · {deal.customer?.company ?? "Empresa"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-extrabold text-ink">{formatCompactCurrency(deal.value)}</p>
                      <p className="text-[10px] font-bold text-secondary">{deal.probability}% IA</p>
                    </div>
                  </button>
                ))}
                {hotDeals.length === 0 ? <EmptyState title="Nenhuma oportunidade quente" description="Crie negócios no pipeline para vê-los aqui." /> : null}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <p className="text-[11px] text-muted">
                  Total ponderado: <strong className="text-ink">{formatCompactCurrency(hotDeals.reduce((sum, deal) => sum + deal.value * (deal.probability / 100), 0))}</strong>
                </p>
                <button type="button" className="text-[11px] font-bold text-primary hover:underline" onClick={() => navigate("/pipeline")}>
                  Abrir Pipeline
                </button>
              </div>
            </Card>

            <Card className="p-4 lg:col-span-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
                  <MessageCircle className="size-4 text-primary" /> Atividades Recentes
                </h2>
                <Badge variant="success"><span className="size-1.5 rounded-full bg-secondary" /> Ao vivo</Badge>
              </div>
              <div className="mt-3 space-y-2.5">
                {data.activities.slice(0, 4).map((activity) => (
                  <div key={activity.id} className="relative flex gap-2.5 pl-1">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", activity.activity_type.includes("deal") ? "bg-primary" : activity.activity_type.includes("task") ? "bg-warning" : "bg-secondary")} />
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[11px] font-medium leading-snug text-ink-soft">{activity.description}</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {activity.user.full_name} · {relativeTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => navigate("/relatorios")} className="mt-3 flex w-full items-center justify-center gap-1 border-t border-line pt-3 text-[11px] font-bold text-primary hover:underline">
                Ver todo o histórico de interações <ArrowUpRight className="size-3" />
              </button>
            </Card>

            <Card className="p-4 lg:col-span-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
                  <CheckSquare className="size-4 text-primary" /> Tarefas do Dia
                </h2>
                <Badge variant="danger">{data.tasks.length} pendentes</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {data.tasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-line bg-surface/60 p-2.5">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        aria-label="Concluir tarefa"
                        onClick={() =>
                          updateTask.mutate(
                            { id: task.id, input: { status: "done" } },
                            { onSuccess: () => toast("Tarefa concluída.") },
                          )
                        }
                        className="mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-slate-300 bg-white transition hover:border-primary hover:bg-primary-soft"
                      />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-ink">{task.title}</p>
                        <p className="mt-0.5 truncate text-[10px] text-muted">{task.customer?.name ?? "Sem cliente"}</p>
                        <p className="text-[10px] font-semibold text-primary">{task.due_date ? relativeTime(task.due_date) : "Sem prazo"}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {data.tasks.length === 0 ? <p className="rounded-lg bg-secondary-soft px-3 py-4 text-center text-xs font-medium text-emerald-700">Nenhuma tarefa pendente. Bom trabalho!</p> : null}
              </div>
              <Button variant="secondary" size="sm" className="mt-3 w-full" leftIcon={<Plus className="size-3.5" />} onClick={() => navigate("/tarefas?nova=1")}>
                Nova Tarefa
              </Button>
              <button type="button" onClick={() => navigate("/tarefas")} className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] font-bold text-primary hover:underline">
                Ver todas <ChevronRight className="size-3" />
              </button>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
