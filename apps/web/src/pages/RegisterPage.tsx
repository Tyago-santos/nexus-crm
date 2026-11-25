import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Check, Mail, Lock, Sparkles, User } from "lucide-react";
import { useAuth } from "@/app/auth";
import { ApiError } from "@/lib/api";
import { Badge, Button, Input } from "@/components/ui";
import { useToast } from "@/components/toast";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    organization_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(form);
      toast("Organização criada. Bem-vindo ao Nexus CRM AI!");
      navigate("/dashboard", { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex h-16 items-center justify-between border-b border-line bg-white px-5 lg:px-8">
        <Link to="/login" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-tertiary text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-[17px] font-extrabold text-ink">Nexus CRM AI</span>
        </Link>
        <Link to="/login" className="text-sm font-semibold text-primary hover:underline">
          Já tenho conta
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr_1fr]">
          <div className="hidden flex-col justify-center rounded-2xl border border-line bg-white p-8 lg:flex">
            <Badge variant="ai" className="w-fit">
              <Sparkles className="size-3" /> Comece em menos de 2 minutos
            </Badge>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink">
              Um novo workspace,<br />pronto para vender.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Crie a sua organização e receba um ambiente isolado com pipeline, WhatsApp, tarefas e agentes de IA
              configurados a partir das suas regras de permissão.
            </p>
            <div className="mt-7 space-y-3">
              {[
                "Isolamento multi-tenant desde o primeiro dia",
                "Agente Copiloto no WhatsApp — você aprova cada envio",
                "Sem filas ou workers: roda no Render Free",
                "Chaves de API nunca expostas no navegador",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-ink-soft">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary-soft text-secondary">
                    <Check className="size-3" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-xl border border-line bg-surface p-4 text-xs text-muted">
              <p className="font-semibold text-ink-soft">Comece agora</p>
              <p className="mt-1">Você pode convidar o seu time e alternar entre os modos de IA a qualquer momento.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm lg:p-8">
            <h2 className="text-xl font-extrabold text-ink">Criar organização</h2>
            <p className="mt-1 text-sm text-muted">Preencha os dados do seu workspace.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Nome da organização</span>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={form.organization_name}
                    onChange={(event) => update("organization_name", event.target.value)}
                    placeholder="A minha empresa"
                    className="h-11 pl-9"
                    required
                    minLength={2}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Seu nome</span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={form.full_name}
                    onChange={(event) => update("full_name", event.target.value)}
                    placeholder="Nome completo"
                    className="h-11 pl-9"
                    required
                    minLength={2}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-soft">E-mail</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    placeholder="voce@empresa.com"
                    className="h-11 pl-9"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-soft">Senha</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(event) => update("password", event.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-11 pl-9"
                    required
                    minLength={6}
                  />
                </div>
              </label>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-danger-soft px-3 py-2.5 text-sm font-medium text-red-700">{error}</div>
              ) : null}

              <Button type="submit" size="lg" loading={loading} className="w-full">
                Criar workspace
                <ArrowRight className="size-4" />
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-muted">
              Ao criar, você concorda com os termos de uso e a política de privacidade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
