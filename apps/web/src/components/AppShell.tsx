import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Building2,
  CheckSquare,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserPlus,
  Users,
  X,
  Zap,
  KanbanSquare,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/app/auth";
import { cn } from "@/lib/utils";
import { Avatar, Badge, Button } from "@/components/ui";
import { useActivities, useLeads, useTasks } from "@/lib/queries";

const navItems = [
  { to: "/assistente", label: "Agente Nexus", icon: Sparkles, pro: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/leads", label: "Leads", icon: UserPlus, badge: "leads" },
  { to: "/pipeline", label: "Pipeline de Vendas", icon: KanbanSquare },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle, online: true },
  { to: "/tarefas", label: "Tarefas", icon: CheckSquare, badge: "tasks" },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
] as const;

const managementItems = [
  { to: "/automacoes", label: "Automações", icon: Zap },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/equipa", label: "Equipa", icon: Building2 },
] as const;

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { data: leads } = useLeads();
  const { data: tasks } = useTasks("pending");
  const { data: activities } = useActivities(3, can("reports:read"));
  const leadsCount = useMemo(() => leads?.filter((lead) => lead.status === "new").length ?? 0, [leads]);
  const tasksCount = tasks?.length ?? 0;

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-line/60 bg-gradient-to-b from-white to-surface-low/40">
      <div className="flex h-20 items-center gap-2.5 px-5">
        <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-primary via-secondary to-tertiary text-white shadow-lg shadow-emerald-200/50">
          <Sparkles className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="font-display text-[17px] font-extrabold tracking-tight text-ink">Nexus CRM AI</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Revenue Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Principal</p>
        <div className="space-y-0.5">
          {navItems
            .filter((item) => item.to !== "/relatorios" || can("reports:read"))
            .map((item) => {
            const Icon = item.icon;
            const isAgent = item.to === "/assistente";
            const count = "badge" in item ? (item.badge === "leads" ? leadsCount || leads?.length || 0 : tasksCount) : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group flex h-11 items-center gap-3 rounded-xl px-2.5 text-[13px] font-semibold transition",
                    isAgent
                      ? isActive
                        ? "bg-gradient-to-r from-primary via-secondary to-tertiary text-white shadow-lg shadow-emerald-200/60"
                        : "bg-gradient-to-r from-primary/10 via-secondary/10 to-tertiary/10 text-primary hover:from-primary/20 hover:via-secondary/20 hover:to-tertiary/20"
                      : isActive
                        ? "bg-primary text-white shadow-sm shadow-emerald-200"
                        : "text-ink-soft hover:bg-surface-low hover:text-ink",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn("size-5 shrink-0", isAgent ? (isActive ? "text-white" : "text-primary") : (isActive ? "text-white" : "text-slate-500"), isAgent && "drop-shadow-sm")} />
                    <span className="flex-1">{item.label}</span>
                    {"online" in item && item.online ? (
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold", isActive ? "text-white" : "text-secondary")}>
                        <span className="size-1.5 rounded-full bg-current animate-pulse-dot" />
                        Online
                      </span>
                    ) : null}
                    {"pro" in item && item.pro ? (
                      <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", isActive ? "bg-white/20 text-white" : "bg-tertiary-soft text-tertiary")}>
                        Pro
                      </span>
                    ) : null}
                    {count ? (
                      <span className={cn("min-w-5 rounded-full px-1.5 text-center text-[10px] font-bold", isActive ? "bg-white/20 text-white" : "bg-danger-soft text-danger")}>
                        {count}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        <p className="mb-1.5 mt-6 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Gestão</p>
        <div className="space-y-0.5">
          {managementItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex h-10 items-center gap-3 rounded-lg px-2.5 text-[13px] font-semibold transition",
                    isActive ? "bg-primary text-white shadow-sm" : "text-ink-soft hover:bg-surface-low hover:text-ink",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn("size-4.5 shrink-0", isActive ? "text-white" : "text-slate-500")} />
                    <span className="flex-1">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {activities && activities.length > 0 ? (
          <div className="mt-6 rounded-xl border border-line bg-surface/70 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Ao vivo</p>
              <span className="size-1.5 rounded-full bg-secondary animate-pulse-dot" />
            </div>
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">{activities[0]?.description}</p>
            <button
              type="button"
              onClick={() => {
                navigate("/relatorios");
                onNavigate?.();
              }}
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-primary"
            >
              Ver atividades <ArrowUpRight className="size-3" />
            </button>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}

export function AppShell() {
  const { session, logout, can } = useAuth();
  const navigate = useNavigate();
  const isChatRoute = location.pathname === "/whatsapp" || location.pathname === "/assistente";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: tasks } = useTasks("pending");
  const { data: activities } = useActivities(5, can("reports:read"));

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!search.trim()) return;
    navigate(`/clientes?search=${encodeURIComponent(search.trim())}`);
    setSearch("");
  };

  return (
    <div className="h-screen overflow-hidden bg-surface">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Sidebar />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-[260px] bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-muted hover:bg-surface-low"
            >
              <X className="size-4" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex h-screen flex-col lg:pl-[260px]">
        <header className="z-30 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-white/85 px-4 backdrop-blur-md lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu className="size-5" />
          </Button>

          <form onSubmit={submitSearch} className="relative hidden min-w-0 flex-1 md:block md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar clientes, negócios, chats ou faturas…"
              className="h-10 w-full rounded-lg border border-line bg-surface-low/70 pl-9 pr-14 text-sm text-ink placeholder:text-slate-400 focus:border-primary/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
              ⌘K
            </kbd>
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            <div className="relative">
              <Button variant="primary" size="md" leftIcon={<Plus className="size-4" />} onClick={() => setCreateOpen((value) => !value)}>
                <span className="hidden sm:inline">Criar</span>
                <ChevronDown className="size-3.5 opacity-80" />
              </Button>
              {createOpen ? (
                <>
                  <button type="button" aria-label="Fechar" className="fixed inset-0 z-30 cursor-default" onClick={() => setCreateOpen(false)} />
                  <div className="absolute right-0 top-12 z-40 w-56 rounded-xl border border-line bg-white p-1.5 shadow-xl animate-fade-up">
                    {[
                      { label: "Novo cliente", to: "/clientes?novo=1", icon: Users },
                      { label: "Nova oportunidade", to: "/pipeline?novo=1", icon: KanbanSquare },
                      { label: "Nova tarefa", to: "/tarefas?nova=1", icon: CheckSquare },
                      { label: "Nova conversa", to: "/whatsapp", icon: MessageCircle },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setCreateOpen(false);
                          navigate(item.to);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-ink-soft transition hover:bg-surface-low"
                      >
                        <item.icon className="size-4 text-slate-500" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <div className="hidden items-center gap-1.5 rounded-lg border border-emerald-200 bg-secondary-soft px-2.5 py-1.5 text-xs font-semibold text-emerald-700 xl:flex">
              <MessageCircle className="size-3.5" />
              WhatsApp Conectado
              <span className="text-[10px] font-medium text-emerald-600">(3 canais)</span>
            </div>

            {can("ai:use") ? (
              <Button variant="ai" size="md" className="hidden sm:inline-flex" leftIcon={<Sparkles className="size-3.5" />} onClick={() => navigate("/assistente")}>
                Nexus Copilot
              </Button>
            ) : null}

            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Notificações">
                <Bell className="size-4.5" />
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-white" />
              </Button>
              {notificationsOpen ? (
                <>
                  <button type="button" aria-label="Fechar" className="fixed inset-0 z-30 cursor-default" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 top-11 z-40 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-white p-3 shadow-xl animate-fade-up">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-ink">Notificações</p>
                      <Badge variant="danger">{tasks?.length ?? 0} tarefas</Badge>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {(activities ?? []).slice(0, 3).map((activity) => (
                        <div key={activity.id} className="rounded-lg bg-surface-low/60 px-2.5 py-2">
                          <p className="line-clamp-2 text-xs font-medium text-ink-soft">{activity.description}</p>
                          <p className="mt-0.5 text-[10px] text-muted">{activity.user.full_name}</p>
                        </div>
                      ))}
                      {!activities?.length ? <p className="py-4 text-center text-xs text-muted">Sem notificações no momento.</p> : null}
                    </div>
                    <Button variant="secondary" size="sm" className="mt-2 w-full" onClick={() => navigate("/tarefas")}>
                      Ver tarefas pendentes
                    </Button>
                  </div>
                </>
              ) : null}
            </div>

            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Ajuda" onClick={() => navigate("/configuracoes")}>
              <CircleHelp className="size-4.5" />
            </Button>

            <div className="relative ml-1">
              <button
                type="button"
                onClick={() => setUserOpen((value) => !value)}
                className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition hover:bg-surface-low"
              >
                <Avatar name={session?.user.full_name ?? "Nexus"} size="sm" online />
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block max-w-28 truncate text-xs font-bold text-ink">{session?.user.full_name}</span>
                  <span className="block text-[10px] capitalize text-muted">{session?.user.role}</span>
                </span>
                <ChevronDown className="size-3.5 text-muted" />
              </button>
              {userOpen ? (
                <>
                  <button type="button" aria-label="Fechar" className="fixed inset-0 z-30 cursor-default" onClick={() => setUserOpen(false)} />
                  <div className="absolute right-0 top-12 z-40 w-60 rounded-xl border border-line bg-white p-1.5 shadow-xl animate-fade-up">
                    <div className="border-b border-line px-2.5 py-2">
                      <p className="truncate text-sm font-bold text-ink">{session?.user.full_name}</p>
                      <p className="truncate text-xs text-muted">{session?.user.email}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary">{session?.user.organization.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUserOpen(false);
                        navigate("/configuracoes");
                      }}
                      className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-soft hover:bg-surface-low"
                    >
                      <Settings className="size-4 text-slate-500" /> Configurações
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setUserOpen(false);
                        await logout();
                        navigate("/login");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
                    >
                      <LogOut className="size-4" /> Terminar sessão
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <main className={cn("flex-1 px-4 py-6 lg:px-7 lg:py-7", isChatRoute ? "overflow-hidden" : "overflow-y-auto")}>
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
