import { useMemo, useState } from "react";
import { Building2, CheckCircle2, Mail, Plus, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useInviteMember, useTeam, useUpdateMemberRole } from "@/lib/queries";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import { useToast } from "@/components/toast";

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Administrador",
  manager: "Gestor",
  seller: "Vendedor",
  support: "Suporte",
};

const roleTone: Record<string, "ai" | "primary" | "warning" | "success" | "neutral"> = {
  owner: "ai",
  admin: "primary",
  manager: "warning",
  seller: "success",
  support: "neutral",
};

export default function TeamPage() {
  const { can, session } = useAuth();
  const { toast } = useToast();
  const canManage = can("team:manage");
  const { data: team, isLoading } = useTeam(canManage);
  const invite = useInviteMember();
  const updateRole = useUpdateMemberRole();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", role: "seller", password: "" });
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const list = team ?? [];
    return [
      { label: "Membros", value: list.length },
      { label: "Gestores", value: list.filter((member) => ["owner", "admin", "manager"].includes(member.role)).length },
      { label: "Vendedores", value: list.filter((member) => member.role === "seller").length },
      { label: "Suporte", value: list.filter((member) => member.role === "support").length },
    ];
  }, [team]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    invite.mutate(
      { ...form, password: form.password || undefined },
      {
        onSuccess: () => {
          toast("Convite enviado. O utilizador já pode entrar com a senha provisória.");
          setOpen(false);
          setForm({ full_name: "", email: "", role: "seller", password: "" });
        },
        onError: (cause) => setError(cause instanceof Error ? cause.message : "Não foi possível convidar o membro."),
      },
    );
  }

  if (!canManage) {
    return (
      <div className="animate-fade-up">
        <PageHeader title="Equipa" description="Gestão de membros e permissões da organização." />
        <Card className="p-6">
          <EmptyState icon={<ShieldCheck className="size-5" />} title="Acesso restrito" description="Apenas owners, administradores e gestores podem ver a equipa." />
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Pessoas</span>}
        title="Equipa"
        description="Convide membros, defina papéis e mantenha o princípio do menor privilégio."
        actions={<Button leftIcon={<UserPlus className="size-4" />} onClick={() => setOpen(true)}>Convidar membro</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label} className="flex items-center gap-3 p-3.5">
            <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary"><Users className="size-4" /></span>
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">{item.label}</p><p className="text-lg font-extrabold text-ink">{item.value}</p></div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3">
          <div>
            <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Building2 className="size-4 text-primary" /> Membros da organização</h2>
            <p className="text-[11px] text-muted">{session?.user.organization.name} · isolamento multi-tenant ativo.</p>
          </div>
          <Badge variant="success"><CheckCircle2 className="size-3" /> RBAC aplicado</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16" />)}</div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-line bg-surface/60 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5">Membro</th>
                  <th className="px-3 py-2.5">E-mail</th>
                  <th className="px-3 py-2.5">Papel</th>
                  <th className="px-3 py-2.5">Desde</th>
                  <th className="px-4 py-2.5 text-right">Permissões</th>
                </tr>
              </thead>
              <tbody>
                {(team ?? []).map((member) => (
                  <tr key={member.id} className="border-b border-line/70 last:border-0 hover:bg-surface/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={member.user.full_name} size="sm" online={member.user_id === session?.user.id} />
                        <div>
                          <p className="text-sm font-bold text-ink">{member.user.full_name} {member.user_id === session?.user.id ? <span className="text-[10px] font-medium text-muted">(você)</span> : null}</p>
                          <Badge variant={roleTone[member.role] ?? "neutral"} className="mt-0.5">{roleLabels[member.role] ?? member.role}</Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="flex items-center gap-1 text-xs text-ink-soft"><Mail className="size-3 text-slate-400" /> {member.user.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      {member.role === "owner" ? (
                        <Badge variant="ai">Owner</Badge>
                      ) : (
                        <Select
                          value={member.role}
                          className="h-8 w-36 text-xs"
                          onChange={(event) => updateRole.mutate({ userId: member.user_id, role: event.target.value }, { onSuccess: () => toast("Papel atualizado."), onError: () => toast("Não foi possível alterar o papel.", "error") })}
                        >
                          {["admin", "manager", "seller", "support"].map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                        </Select>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted">{formatDate(member.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", member.role === "owner" ? "bg-tertiary-soft text-tertiary" : "bg-surface-low text-muted")}>
                        {member.role === "owner" ? "Acesso total" : "Permissões por papel"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          { title: "Menor privilégio", text: "Cada papel recebe apenas as permissões necessárias para a função.", icon: ShieldCheck },
          { title: "Auditoria", text: "Atividades e alterações ficam registadas na linha do tempo da organização.", icon: CheckCircle2 },
          { title: "Isolamento", text: "Membros de outra organização nunca acessam os seus dados, mesmo com IDs válidos.", icon: Building2 },
        ].map((item) => (
          <Card key={item.title} className="flex gap-2.5 p-3.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary-soft text-secondary"><item.icon className="size-4" /></span>
            <div><p className="text-xs font-bold text-ink">{item.title}</p><p className="text-[11px] leading-relaxed text-muted">{item.text}</p></div>
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Convidar membro"
        description="O utilizador entra na organização com a senha provisória indicada."
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" form="invite-form" loading={invite.isPending} leftIcon={<Plus className="size-3.5" />}>Enviar convite</Button></>}
      >
        <form id="invite-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome completo" className="sm:col-span-2"><Input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required placeholder="Novo membro" /></Field>
          <Field label="E-mail" className="sm:col-span-2"><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required placeholder="membro@empresa.com" /></Field>
          <Field label="Papel"><Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{["admin", "manager", "seller", "support"].map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</Select></Field>
          <Field label="Senha provisória" hint="Mínimo 6 caracteres."><Input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={6} /></Field>
          {error ? <div className="sm:col-span-2 rounded-xl bg-danger-soft px-3 py-2 text-xs font-medium text-red-700">{error}</div> : null}
        </form>
      </Modal>
    </div>
  );
}
