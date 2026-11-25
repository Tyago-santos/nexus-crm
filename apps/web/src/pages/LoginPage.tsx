import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, Check, Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import { useAuth } from "@/app/auth";
import { ApiError } from "@/lib/api";
import { Badge, Button, Input } from "@/components/ui";
import { useToast } from "@/components/toast";

const demoAccounts = [
  { label: "Owner", email: "camila@nexus.ai", description: "Acesso completo" },
  { label: "Manager", email: "marina@nexus.ai", description: "Gestão comercial" },
  { label: "Seller", email: "rafael@nexus.ai", description: "Vendas" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("camila@nexus.ai");
  const [password, setPassword] = useState("nexus123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      toast("Bem-vindo de volta ao Nexus CRM AI.");
      navigate(from, { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#0b1020] p-10 text-white lg:flex xl:p-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-10 size-96 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 size-96 rounded-full bg-tertiary/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:28px_28px]" />
        </div>

        <div className="relative flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-tertiary shadow-lg">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold">Nexus CRM AI</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">Revenue Intelligence</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Badge variant="ai" className="bg-white/10 text-indigo-200">
            <Sparkles className="size-3" /> CRM com agentes de IA
          </Badge>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">
            O CRM que pensa <span className="bg-gradient-to-r from-indigo-300 to-emerald-300 bg-clip-text text-transparent">junto com o seu time.</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Centralize clientes, WhatsApp e pipeline. A IA qualifica leads, sugere respostas e aponta oportunidades
            paradas — sem planilhas e sem trabalho manual.
          </p>

          <div className="mt-8 space-y-3">
            {[
              "Atendimento WhatsApp em 3 colunas com modo manual, copiloto e automático",
              "Agentes controlados por RBAC — a IA nunca executa SQL livre",
              "Multi-tenant com isolamento por organização (RLS)",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm text-white/75">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
                  <Check className="size-3" />
                </span>
                {item}
              </div>
            ))}
          </div>

          <div className="mt-9 grid grid-cols-3 gap-3">
            {[
              { label: "Receita/mês", value: "R$ 184k" },
              { label: "Conversão", value: "26%" },
              { label: "Leads/IA", value: "342" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                <p className="font-display text-lg font-extrabold">{item.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-white/50">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-white/40">
          <BarChart3 className="size-4" />
          Dados de demonstração isolados por organização. Nenhum credencial fica no frontend.
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-5 py-10 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-tertiary text-white">
              <Sparkles className="size-4" />
            </span>
            <p className="font-display text-lg font-extrabold text-ink">Nexus CRM AI</p>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Bem-vindo de volta</p>
          <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink">Entre na sua conta</h2>
          <p className="mt-1 text-sm text-muted">Use as credenciais de demonstração ou a sua conta.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">E-mail corporativo</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 pl-9"
                  placeholder="voce@empresa.com"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Senha</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 pl-9 pr-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-ink"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-danger-soft px-3 py-2.5 text-sm font-medium text-red-700">{error}</div>
            ) : null}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              Entrar no Nexus
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-line bg-surface/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Contas de demonstração · senha nexus123</p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword("nexus123");
                    setError(null);
                  }}
                  className="rounded-lg border border-line bg-white px-2 py-1.5 text-left transition hover:border-primary/40 hover:bg-primary-soft/40"
                >
                  <span className="block text-[11px] font-bold text-ink">{account.label}</span>
                  <span className="block truncate text-[10px] text-muted">{account.email}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="font-semibold text-primary hover:underline">
              Criar organização
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
