import { useMemo, useState } from "react";
import {
  BarChart3,
  CircleDollarSign,
  Download,
  PieChart as PieIcon,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboard, useSalesReport } from "@/lib/queries";
import { Badge, Button, Card, EmptyState, PageHeader, Progress, Skeleton, StatCard } from "@/components/ui";
import { formatCompactCurrency, formatCurrency, stageLabel } from "@/lib/utils";
import { useToast } from "@/components/toast";

const statusColors = ["#4f46e5", "#6366f1", "#8b5cf6", "#a855f7", "#f59e0b", "#10b981", "#94a3b8"];

export default function ReportsPage() {
  const { toast } = useToast();
  const { data: report, isLoading, error } = useSalesReport();
  const { data: dashboard } = useDashboard();
  const [period, setPeriod] = useState("30");

  const pieData = useMemo(
    () => (report?.by_stage ?? []).filter((stage) => stage.count > 0).map((stage) => ({ name: stageLabel(stage.stage), value: stage.value, count: stage.count })),
    [report],
  );
  const maxOwner = Math.max(1, ...(report?.by_owner.map((owner) => owner.revenue) ?? [1]));

  function exportCsv() {
    if (!report) return;
    const rows = [
      ["Métrica", "Valor"],
      ["Receita ganha", String(report.revenue)],
      ["Negócios ganhos", String(report.won_deals)],
      ["Ticket médio", String(report.average_ticket)],
      [],
      ["Responsável", "Receita", "Negócios"],
      ...report.by_owner.map((owner) => [owner.owner, String(owner.revenue), String(owner.deals)]),
      [],
      ["Estágio", "Quantidade", "Valor"],
      ...report.by_stage.map((stage) => [stageLabel(stage.stage), String(stage.count), String(stage.value)]),
    ];
    const csv = rows.map((row) => row.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nexus-relatorio-vendas.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast("Relatório de vendas exportado.");
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Relatórios" description="Receita, conversão e desempenho por responsável." />
        <Card className="p-6">
          <EmptyState icon={<BarChart3 className="size-5" />} title="Sem permissão de relatórios" description="Apenas gestores, vendedores e administradores acedem a esta área." />
        </Card>
      </div>
    );
  }

  if (isLoading || !report) {
    return (
      <div>
        <Skeleton className="mb-4 h-16 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}</div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Analytics</span>}
        title="Relatórios"
        description="Receita, conversão e desempenho por responsável e estágio do pipeline."
        actions={
          <>
            <div className="flex rounded-lg border border-line bg-white p-0.5">
              {["30", "90", "365"].map((item) => (
                <button key={item} type="button" onClick={() => setPeriod(item)} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${period === item ? "bg-primary text-white" : "text-muted hover:text-ink"}`}>
                  {item === "30" ? "30 dias" : item === "90" ? "Trimestre" : "12 meses"}
                </button>
              ))}
            </div>
            <Button variant="secondary" leftIcon={<Download className="size-3.5" />} onClick={exportCsv}>Exportar CSV</Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Receita ganha" value={formatCurrency(report.revenue)} icon={<CircleDollarSign className="size-4" />} trend={{ value: "↑ +18,6%" }} hint="vs. período anterior" />
        <StatCard label="Negócios ganhos" value={report.won_deals} icon={<Trophy className="size-4" />} tone="success" hint="fechados com sucesso" />
        <StatCard label="Ticket médio" value={formatCurrency(report.average_ticket)} icon={<Target className="size-4" />} tone="tertiary" hint="por venda ganha" />
        <StatCard label="Conversão" value={`${dashboard?.conversion_rate ?? 0}%`} icon={<TrendingUp className="size-4" />} tone="warning" hint="meta: 22%" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-ink">Receita vs. Meta</h2>
              <p className="text-xs text-muted">Comparativo mensal de receita realizada.</p>
            </div>
            <Badge variant="success">Acima da meta</Badge>
          </div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard?.sales_by_month ?? []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e8edf7" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(value: number) => `${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name === "meta" ? "Meta" : "Realizado"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => (value === "meta" ? "Meta" : "Realizado")} />
                <Bar dataKey="meta" fill="#e0e7ff" radius={[6, 6, 0, 0]} barSize={22} />
                <Bar dataKey="realizado" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-1.5 font-display text-base font-bold text-ink"><PieIcon className="size-4 text-primary" /> Receita por estágio</h2>
              <p className="text-xs text-muted">Distribuição do valor no pipeline.</p>
            </div>
            <Badge variant="outline">{pieData.length} estágios</Badge>
          </div>
          {pieData.length > 0 ? (
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2} stroke="none">
                    {pieData.map((entry, index) => <Cell key={entry.name} fill={statusColors[index % statusColors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name)]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-3"><EmptyState icon={<PieIcon className="size-5" />} title="Sem dados no funil" description="Crie oportunidades para visualizar a distribuição." /></div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Card className="p-4 lg:col-span-7">
          <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Users className="size-4 text-primary" /> Desempenho por responsável</h2>
          <div className="mt-3 space-y-3">
            {report.by_owner.map((owner) => (
              <div key={owner.owner}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-ink-soft">{owner.owner}</span>
                  <span className="text-muted"><strong className="text-ink">{formatCompactCurrency(owner.revenue)}</strong> · {owner.deals} negócio(s)</span>
                </div>
                <Progress value={(owner.revenue / maxOwner) * 100} tone={owner.revenue === maxOwner ? "success" : "primary"} />
              </div>
            ))}
            {report.by_owner.length === 0 ? <p className="py-6 text-center text-xs text-muted">Nenhuma venda ganha registada.</p> : null}
          </div>
        </Card>

        <Card className="p-4 lg:col-span-5">
          <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><PieIcon className="size-4 text-primary" /> Detalhe do funil</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-xs">
              <thead><tr className="bg-surface text-[10px] uppercase tracking-wide text-muted"><th className="px-3 py-2">Estágio</th><th className="px-3 py-2 text-right">Qtd.</th><th className="px-3 py-2 text-right">Valor</th></tr></thead>
              <tbody>
                {report.by_stage.map((stage) => (
                  <tr key={stage.stage} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-ink-soft">{stageLabel(stage.stage)}</td>
                    <td className="px-3 py-2 text-right text-muted">{stage.count}</td>
                    <td className="px-3 py-2 text-right font-semibold text-ink">{formatCompactCurrency(stage.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Sparkles className="size-4 text-tertiary" /> Insights do período</h2>
          <Badge variant="ai">Nexus Intelligence</Badge>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {(dashboard?.insights ?? []).map((insight) => (
            <div key={insight.id} className="rounded-xl border border-line p-3">
              <Badge variant={insight.severity === "high" ? "danger" : insight.severity === "positive" ? "success" : "ai"}>{insight.severity}</Badge>
              <p className="mt-1.5 text-xs font-bold text-ink">{insight.title}</p>
              <p className="mt-0.5 line-clamp-3 text-[11px] leading-relaxed text-muted">{insight.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
