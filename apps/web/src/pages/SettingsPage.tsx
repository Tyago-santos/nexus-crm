import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clipboard,
  Cloud,
  Copy,
  Database,
  ExternalLink,
  Globe,
  KeyRound,
  Link2,
  Lock,
  MessageCircle,
  Plug,
  RefreshCw,
  ServerCog,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Unplug,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/app/auth";
import { useAccounts, useDisconnectWhatsApp, useTeam } from "@/lib/queries";
import { Avatar, Badge, Button, Card, Field, PageHeader, Progress, Select, Toggle } from "@/components/ui";
import { WhatsAppConnectModal } from "@/components/WhatsAppConnect";
import { cn, formatDate, formatPhone } from "@/lib/utils";
import { useToast } from "@/components/toast";

const tabs = [
  { id: "organization", label: "Organização", icon: Building2 },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "ai", label: "IA & Segurança", icon: Sparkles },
  { id: "api", label: "API & Deploy", icon: ServerCog },
];

const roleMatrix = [
  { role: "Owner", permissions: "Acesso total · faturamento · equipa · IA · automações" },
  { role: "Admin", permissions: "Tudo exceto configurações críticas da organização" },
  { role: "Manager", permissions: "Clientes, pipeline, WhatsApp, relatórios e equipa" },
  { role: "Seller", permissions: "Clientes, leads, negócios, tarefas, WhatsApp e IA" },
  { role: "Support", permissions: "Leitura comercial + atendimento WhatsApp e IA" },
];

export default function SettingsPage() {
  const { session, can } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("organization");
  const [connectOpen, setConnectOpen] = useState(false);
  const [humanApproval, setHumanApproval] = useState(true);
  const [autoFollowup, setAutoFollowup] = useState(true);
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: team } = useTeam(can("team:manage"));
  const disconnect = useDisconnectWhatsApp();

  const account = accounts?.[0];
  const webhookUrl = useMemo(() => `${typeof window === "undefined" ? "" : window.location.origin}/api/webhooks/whatsapp`, []);
  const docsUrl = import.meta.env.DEV ? "http://localhost:3333/docs" : "/docs";

  function copy(value: string, label: string) {
    navigator.clipboard
      .writeText(value)
      .then(() => toast(`${label} copiado.`, "info"))
      .catch(() => toast("Não foi possível copiar.", "error"));
  }

  function startConnect() {
    setConnectOpen(true);
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Administração</span>}
        title="Configurações"
        description="Organização, canais WhatsApp, postura de IA e parâmetros de deploy no Render Free."
      />

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="h-fit p-1.5">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition",
                tab === item.id ? "bg-primary-soft text-primary" : "text-ink-soft hover:bg-surface-low",
              )}
            >
              <item.icon className="size-4" /> {item.label}
            </button>
          ))}
        </Card>

        <div className="space-y-4">
          {tab === "organization" ? (
            <>
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Building2 className="size-4 text-primary" /> Perfil da organização</h2>
                  <Badge variant="success">Plano Enterprise</Badge>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-surface p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Nome</p>
                    <p className="mt-0.5 text-sm font-bold text-ink">{session?.user.organization.name}</p>
                  </div>
                  <div className="rounded-xl bg-surface p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Slug</p>
                    <p className="mt-0.5 font-mono text-sm text-ink">{session?.user.organization.slug}</p>
                  </div>
                  <div className="rounded-xl bg-surface p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">ID da organização</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-ink">{session?.user.organization.id}</p>
                  </div>
                  <div className="rounded-xl bg-surface p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Membros</p>
                    <p className="mt-0.5 text-sm font-bold text-ink">{team?.length ?? "—"} utilizadores</p>
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted"><Lock className="size-3" /> Dados isolados por organização. Toda leitura é filtrada por RLS no Supabase.</p>
              </Card>

              <Card className="p-4">
                <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Users className="size-4 text-primary" /> A sua conta</h2>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-line p-3">
                  <Avatar name={session?.user.full_name ?? "Nexus"} size="lg" online />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink">{session?.user.full_name}</p>
                    <p className="text-xs text-muted">{session?.user.email}</p>
                    <Badge variant="ai" className="mt-1 capitalize">{session?.user.role}</Badge>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => toast("Perfil editável na próxima fase.", "info")}>Editar perfil</Button>
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><ShieldCheck className="size-4 text-primary" /> Matriz de permissões</h2>
                <div className="mt-2.5 overflow-hidden rounded-xl border border-line">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-surface text-[10px] uppercase tracking-wide text-muted"><th className="px-3 py-2">Papel</th><th className="px-3 py-2">Permissões</th></tr></thead>
                    <tbody>
                      {roleMatrix.map((item) => <tr key={item.role} className="border-t border-line"><td className="px-3 py-2 font-semibold text-ink">{item.role}</td><td className="px-3 py-2 text-[11px] text-muted">{item.permissions}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : null}

          {tab === "whatsapp" ? (
            <>
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><MessageCircle className="size-4 text-primary" /> Canal WhatsApp</h2>
                    <p className="text-xs text-muted">Conexão stateless recomendada para Render Free.</p>
                  </div>
                  <Badge variant={account?.connection_status === "connected" ? "success" : "warning"}>{account?.connection_status ?? "não configurado"}</Badge>
                </div>
                {loadingAccounts ? <div className="mt-3 h-20 animate-pulse rounded-xl bg-surface-high" /> : account ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-secondary-soft text-secondary"><Smartphone className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{formatPhone(account.phone_number)}</p>
                      <p className="text-[11px] text-muted">Provider: {account.provider === "meta_cloud" ? "Meta Cloud API (webhook)" : "Baileys (processo persistente)"} · desde {formatDate(account.created_at)}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="size-3.5" />} onClick={startConnect}>Reconectar</Button>
                      <Button variant="secondary" size="sm" className="text-danger" leftIcon={<Unplug className="size-3.5" />} onClick={() => disconnect.mutate(account.id, { onSuccess: () => toast("Canal desconectado.", "info") })}>Desconectar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-line p-4 text-center">
                    <p className="text-sm font-semibold text-ink">Nenhum canal conectado</p>
                    <p className="mt-0.5 text-xs text-muted">Conecte um número para receber e enviar mensagens.</p>
                    <Button size="sm" className="mt-2" leftIcon={<Plug className="size-3.5" />} onClick={startConnect}>Conectar WhatsApp</Button>
                  </div>
                )}
              </Card>

              <div className="grid gap-3 md:grid-cols-2">
                <Card className="p-4">
                  <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-secondary-soft text-secondary"><Cloud className="size-4" /></span><div><p className="text-xs font-bold text-ink">Meta Cloud API</p><p className="text-[10px] text-muted">Recomendado no Render Free</p></div></div>
                  <ul className="mt-2 space-y-1 text-[11px] text-muted">
                    <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 size-3 shrink-0 text-secondary" /> Webhook stateless — sem processo persistente.</li>
                    <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 size-3 shrink-0 text-secondary" /> Recebe mensagens e responde in-process.</li>
                    <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 size-3 shrink-0 text-secondary" /> Funciona após cold start do Render.</li>
                  </ul>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-warning-soft text-warning"><Smartphone className="size-4" /></span><div><p className="text-xs font-bold text-ink">Baileys</p><p className="text-[10px] text-muted">Apenas local / VPS</p></div></div>
                  <ul className="mt-2 space-y-1 text-[11px] text-muted">
                    <li className="flex gap-1.5"><span className="mt-1 size-1 rounded-full bg-warning" /> Exige processo Node sempre ativo.</li>
                    <li className="flex gap-1.5"><span className="mt-1 size-1 rounded-full bg-warning" /> Não sobrevive ao sleep do Render Free.</li>
                    <li className="flex gap-1.5"><span className="mt-1 size-1 rounded-full bg-warning" /> Útil para testes locais e QR Code.</li>
                  </ul>
                </Card>
              </div>

              <Card className="p-4">
                <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Link2 className="size-4 text-primary" /> Endpoint do webhook</h2>
                <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-line bg-surface p-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-soft">{webhookUrl}</code>
                  <Button variant="ghost" size="icon" aria-label="Copiar URL" onClick={() => copy(webhookUrl, "URL do webhook")}><Copy className="size-3.5" /></Button>
                </div>
                <p className="mt-1.5 text-[10px] text-muted">Para a Meta, acrescente <code className="rounded bg-surface-high px-1">?organization_id=…&amp;account_id=…</code> e configure o verify token igual ao <code className="rounded bg-surface-high px-1">WEBHOOK_SECRET</code>.</p>
              </Card>
            </>
          ) : null}

          {tab === "ai" ? (
            <>
              <Card className="p-4">
                <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Sparkles className="size-4 text-primary" /> Postura dos agentes</h2>
                <p className="text-xs text-muted">Políticas aplicadas a todos os agentes da organização.</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-line p-3">
                    <div><p className="text-xs font-bold text-ink">Aprovação humana no modo Copiloto</p><p className="text-[11px] text-muted">Sugestões de resposta nunca são enviadas sem ação de um utilizador.</p></div>
                    <Toggle checked={humanApproval} onChange={(checked) => { setHumanApproval(checked); toast(checked ? "Aprovação humana obrigatória." : "Modo automático permitido.", "info"); }} disabled={!can("ai:configure")} />
                  </div>
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-line p-3">
                    <div><p className="text-xs font-bold text-ink">Follow-up automático de conversas paradas</p><p className="text-[11px] text-muted">Cria tarefa quando não há resposta há 48h. Execução por cron HTTP.</p></div>
                    <Toggle checked={autoFollowup} onChange={(checked) => { setAutoFollowup(checked); toast(checked ? "Follow-up ativado." : "Follow-up desativado.", "info"); }} disabled={!can("ai:configure")} />
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-secondary-soft/40 p-3">
                    <p className="text-xs font-bold text-ink">Modo padrão: Copiloto</p>
                    <p className="text-[11px] text-muted">Novas conversas começam com sugestões da IA e envio aprovado pelo atendente.</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><ShieldCheck className="size-4 text-secondary" /> Guardrails técnicos</h2>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {[
                    { icon: Database, title: "Sem SQL livre", text: "A IA só usa ferramentas tipadas e escopadas por organização." },
                    { icon: Lock, title: "RBAC em cada ação", text: "Permissões verificadas antes de qualquer leitura ou escrita." },
                    { icon: KeyRound, title: "Segredos no servidor", text: "Chaves de IA e WhatsApp nunca chegam ao navegador." },
                    { icon: Globe, title: "Multi-tenant", text: "RLS no Supabase e filtro de organização em todos os handlers." },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-2 rounded-xl bg-surface p-2.5">
                      <item.icon className="mt-0.5 size-4 shrink-0 text-secondary" />
                      <div><p className="text-[11px] font-bold text-ink">{item.title}</p><p className="text-[10px] text-muted">{item.text}</p></div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : null}

          {tab === "api" ? (
            <>
              <Card className="p-4">
                <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><ServerCog className="size-4 text-primary" /> Deploy no Render Free</h2>
                <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-muted">
                  <p className="flex gap-1.5"><Zap className="mt-0.5 size-3 shrink-0 text-primary" /> API e frontend estáticos correm sem Redis, sem BullMQ e sem worker.</p>
                  <p className="flex gap-1.5"><RefreshCw className="mt-0.5 size-3 shrink-0 text-primary" /> Webhook WhatsApp é processado sincronamente e idempotente por <code className="rounded bg-surface-high px-1">external_message_id</code>.</p>
                  <p className="flex gap-1.5"><Database className="mt-0.5 size-3 shrink-0 text-primary" /> Cron externo chama <code className="rounded bg-surface-high px-1">/api/internal/followup/run</code> com <code className="rounded bg-surface-high px-1">x-cron-secret</code>.</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={docsUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink-soft hover:bg-surface">
                    <ExternalLink className="size-3.5" /> Swagger /docs
                  </a>
                  <Button variant="secondary" size="sm" leftIcon={<Clipboard className="size-3.5" />} onClick={() => copy("GET /health", "Endpoint de saúde")}>Healthcheck</Button>
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Settings className="size-4 text-primary" /> Variáveis de ambiente necessárias</h2>
                <div className="mt-2 overflow-hidden rounded-xl border border-line">
                  <table className="w-full text-left text-[11px]">
                    <thead><tr className="bg-surface text-[10px] uppercase tracking-wide text-muted"><th className="px-3 py-2">Variável</th><th className="px-3 py-2">Função</th></tr></thead>
                    <tbody>
                      {[
                        ["DATABASE_URL", "Conexão Supabase (Postgres)"],
                        ["JWT_SECRET", "Assinatura dos tokens de sessão"],
                        ["WEBHOOK_SECRET", "Validação do webhook Meta"],
                        ["CRON_SECRET", "Rotina de follow-up via cron"],
                        ["WHATSAPP_PROVIDER", "disabled | meta_cloud | baileys"],
                        ["OPENAI_API_KEY", "Agentes de IA (opcional em demo)"],
                      ].map(([name, description]) => <tr key={name} className="border-t border-line"><td className="px-3 py-2 font-mono text-[10px] text-ink">{name}</td><td className="px-3 py-2 text-muted">{description}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="border-amber-200 bg-warning-soft/40 p-4">
                <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><ShieldCheck className="size-4 text-warning" /> Nota de segurança</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">Nunca coloque chaves de serviço no frontend. O build estático só recebe <code className="rounded bg-white px-1">VITE_API_URL</code>; todas as chamadas sensíveis passam pela API.</p>
              </Card>
            </>
          ) : null}
        </div>
      </div>

      <WhatsAppConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
    </div>
  );
}
