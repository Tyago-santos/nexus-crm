import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Database,
  Info,
  MessageCircle,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/app/auth";
import { useActivities, useAutomations, useRunFollowup, useToggleAutomation } from "@/lib/queries";
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton, Toggle } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";
import { useToast } from "@/components/toast";

const triggerMeta: Record<string, { label: string; icon: typeof Zap; tone: string }> = {
  "customer.created": { label: "Novo cliente", icon: Users, tone: "bg-primary-soft text-primary" },
  "conversation.inactive": { label: "Conversa inativa", icon: Clock, tone: "bg-warning-soft text-warning" },
  "lead.qualified": { label: "Lead qualificado", icon: Target, tone: "bg-tertiary-soft text-tertiary" },
  "message.received": { label: "Mensagem recebida", icon: MessageCircle, tone: "bg-sky-50 text-sky-600" },
  "deal.won": { label: "Venda ganha", icon: CheckCircle2, tone: "bg-secondary-soft text-secondary" },
  "customer.churn_risk": { label: "Risco de churn", icon: ShieldCheck, tone: "bg-danger-soft text-danger" },
};

const actionLabels: Record<string, string> = {
  create_lead: "Criar lead",
  score_lead: "Score IA",
  send_whatsapp: "Enviar WhatsApp",
  create_task: "Criar tarefa",
  draft_ai_followup: "Rascunho IA",
  move_deal: "Mover negócio",
  notify_owner: "Notificar responsável",
  classify_intent: "Classificar intenção",
  update_conversation: "Atualizar conversa",
  notify_team: "Notificar equipa",
  alert_manager: "Alertar gestor",
};

export default function AutomationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can("automations:manage");
  const { data: automations, isLoading } = useAutomations(canManage);
  const { data: activities } = useActivities(30, can("reports:read"));
  const toggle = useToggleAutomation();
  const runFollowup = useRunFollowup();

  const activeCount = (automations ?? []).filter((automation) => automation.is_active).length;
  const executions = useMemo(
    () => (activities ?? []).filter((activity) => activity.activity_type.startsWith("automation") || Boolean(activity.metadata && "automation" in activity.metadata)),
    [activities],
  );

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Nexus Intelligence</span>}
        title="Automações"
        description="Regras determinísticas e agentes de IA a correr de forma síncrona na API — sem filas, sem Redis e sem workers."
        actions={
          canManage ? (
            <Button
              leftIcon={<PlayCircle className="size-4" />}
              loading={runFollowup.isPending}
              onClick={() =>
                runFollowup.mutate(undefined, {
                  onSuccess: (result) => toast(`Verificação concluída: ${result.created_tasks} tarefa(s) de follow-up criada(s).`),
                  onError: () => toast("Não foi possível executar a verificação.", "error"),
                })
              }
            >
              Executar follow-up 48h
            </Button>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-3 p-3.5"><span className="grid size-9 place-items-center rounded-lg bg-secondary-soft text-secondary"><Zap className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Automações ativas</p><p className="text-lg font-extrabold text-ink">{activeCount} <span className="text-xs font-medium text-muted">/ {automations?.length ?? 0}</span></p></div></Card>
        <Card className="flex items-center gap-3 p-3.5"><span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary"><RefreshCw className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Execuções registadas</p><p className="text-lg font-extrabold text-ink">{executions.length}</p></div></Card>
        <Card className="flex items-center gap-3 p-3.5"><span className="grid size-9 place-items-center rounded-lg bg-tertiary-soft text-tertiary"><Sparkles className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Agentes IA ligados</p><p className="text-lg font-extrabold text-ink">4</p></div></Card>
        <Card className="flex items-center gap-3 p-3.5"><span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><Timer className="size-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Modo de execução</p><p className="text-lg font-extrabold text-ink">Síncrono</p></div></Card>
      </div>

      {!canManage ? (
        <Card className="mb-4 flex items-start gap-2.5 border-amber-200 bg-warning-soft/60 p-3.5">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-bold text-ink">Acesso somente leitura</p>
            <p className="text-xs text-muted">O seu papel não permite gerir automações. Peça ao owner ou administrador para alterar as regras.</p>
          </div>
        </Card>
      ) : null}

      {isLoading && canManage ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-52" />)}</div>
      ) : !canManage ? (
        <Card className="p-6"><EmptyState icon={<Zap className="size-5" />} title="Automações restritas" description="Apenas owners e administradores podem ver e editar as regras de automação." /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(automations ?? []).map((automation) => {
            const meta = triggerMeta[automation.trigger_type] ?? { label: automation.trigger_type, icon: Zap, tone: "bg-surface-low text-muted" };
            const Icon = meta.icon;
            return (
              <Card key={automation.id} className={cn("flex flex-col p-4", !automation.is_active && "opacity-75")}>
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", meta.tone)}><Icon className="size-4" /></span>
                  <Toggle
                    checked={automation.is_active}
                    disabled={!canManage || toggle.isPending}
                    label={automation.name}
                    onChange={(checked) =>
                      toggle.mutate(
                        { id: automation.id, isActive: checked },
                        {
                          onSuccess: () => toast(checked ? "Automação ativada." : "Automação pausada.", "info"),
                          onError: () => toast("Não foi possível alterar a automação.", "error"),
                        },
                      )
                    }
                  />
                </div>
                <p className="mt-2.5 text-sm font-bold leading-snug text-ink">{automation.name}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{automation.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <Badge variant={automation.is_active ? "success" : "neutral"}>
                    <span className={cn("size-1.5 rounded-full", automation.is_active ? "bg-secondary" : "bg-slate-400")} />
                    {automation.is_active ? "Ativa" : "Pausada"}
                  </Badge>
                  <Badge variant="outline">Gatilho: {meta.label}</Badge>
                </div>
                <div className="mt-2.5 flex flex-1 flex-wrap content-start gap-1 border-t border-line pt-2.5">
                  {automation.actions.map((action, index) => {
                    const type = String(action.type ?? "action");
                    return <Badge key={`${type}-${index}`} variant="primary" className="text-[9px]">{actionLabels[type] ?? type}</Badge>;
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                  <span>Atualizada {relativeTime(automation.updated_at)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (automation.trigger_type === "conversation.inactive") {
                        runFollowup.mutate(undefined, {
                          onSuccess: (result) => toast(`Follow-up: ${result.created_tasks} tarefa(s) criada(s).`),
                          onError: () => toast("Não foi possível executar.", "error"),
                        });
                      } else if (automation.trigger_type === "customer.created") {
                        navigate("/clientes?novo=1");
                      } else if (automation.trigger_type === "deal.won") {
                        navigate("/pipeline");
                      } else {
                        navigate("/assistente");
                      }
                    }}
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                  >
                    Testar <ArrowRight className="size-3" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Card className="p-4 lg:col-span-7">
          <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><RefreshCw className="size-4 text-primary" /> Registo de execuções</h2>
          <p className="text-[11px] text-muted">Ações disparadas por automações e agentes, sem intermediários assíncronos.</p>
          <div className="mt-3 space-y-2">
            {executions.slice(0, 8).map((activity) => (
              <div key={activity.id} className="flex items-start gap-2.5 rounded-xl border border-line p-2.5">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-secondary-soft text-secondary"><Bot className="size-3.5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-ink-soft">{activity.description}</p>
                  <p className="text-[10px] text-muted">{activity.user.full_name} · {relativeTime(activity.created_at)}</p>
                </div>
                <Badge variant="success">ok</Badge>
              </div>
            ))}
            {executions.length === 0 ? <p className="rounded-xl bg-surface px-3 py-6 text-center text-xs text-muted">Nenhuma execução registada ainda. Execute a verificação de follow-up para gerar atividade.</p> : null}
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-5">
          <Card className="border-indigo-100 bg-gradient-to-br from-primary-soft/60 to-white p-4">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Sparkles className="size-4 text-primary" /> Sem filas. Sem workers.</h2>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
              No Render Free não há processo persistente para BullMQ, Redis ou Baileys. O Nexus executa tudo dentro da própria API:
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] text-ink-soft">
              <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 size-3 shrink-0 text-secondary" /> Webhook recebido → persistido → IA responde na mesma chamada.</li>
              <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 size-3 shrink-0 text-secondary" /> Follow-ups por endpoint HTTP de cron autenticado.</li>
              <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 size-3 shrink-0 text-secondary" /> Automações de cliente e venda disparam na transação.</li>
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Timer className="size-4 text-primary" /> Cron HTTP (Render Free)</h2>
            <p className="mt-1 text-[11px] text-muted">Configure um cron externo (ex.: cron-job.org) para chamar a rotina de follow-up a cada hora.</p>
            <pre className="mt-2 overflow-x-auto no-scrollbar rounded-lg bg-[#0b1020] p-2.5 text-[10px] leading-relaxed text-indigo-100">
{`POST https://<sua-api>.onrender.com/api/internal/followup/run
x-cron-secret: $CRON_SECRET
content-type: application/json

{ "organization_id": "<org-id>" }`}
            </pre>
            <p className="mt-2 flex items-center gap-1 text-[10px] text-muted"><Database className="size-3" /> Sem Redis, sem conexões persistentes.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
