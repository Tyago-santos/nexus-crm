import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2,
  ChevronRight,
  Filter,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Tag,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/app/auth";
import { api, ApiError } from "@/lib/api";
import { useCreateCustomer, useCustomers, useTeam } from "@/lib/queries";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, Textarea } from "@/components/ui";
import { cn, formatDate, formatPhone } from "@/lib/utils";
import { useToast } from "@/components/toast";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  company: "",
  document: "",
  tags: "",
  notes: "",
  assigned_to: "",
};

export default function CustomersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { can } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const deferredSearch = useDeferredValue(search);
  const [tag, setTag] = useState("");
  const [open, setOpen] = useState(params.get("novo") === "1");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const { data: customers, isLoading } = useCustomers(deferredSearch, tag);
  const { data: team } = useTeam(can("team:manage"));
  const createCustomer = useCreateCustomer();

  useEffect(() => {
    if (params.get("novo") === "1") setOpen(true);
  }, [params]);

  const tags = useMemo(() => {
    const all = new Set<string>();
    (customers ?? []).forEach((customer) => customer.tags.forEach((item) => all.add(item)));
    return [...all].sort((a, b) => a.localeCompare(b));
  }, [customers]);

  function closeModal() {
    setOpen(false);
    setForm(emptyForm);
    setError(null);
    if (params.get("novo")) {
      params.delete("novo");
      setParams(params, { replace: true });
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    createCustomer.mutate(
      {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        company: form.company.trim() || null,
        document: form.document.trim() || null,
        notes: form.notes.trim() || null,
        tags: form.tags.split(",").map((item) => item.trim()).filter(Boolean),
        ...(form.assigned_to ? { assigned_to: form.assigned_to } : {}),
      },
      {
        onSuccess: (customer) => {
          toast(`Cliente ${customer.name} cadastrado.`);
          closeModal();
          navigate(`/clientes/${customer.id}`);
        },
        onError: (cause) => setError(cause instanceof ApiError ? cause.message : "Não foi possível cadastrar o cliente."),
      },
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Base de clientes</span>}
        title="Clientes"
        description="Uma visão única de contatos, empresas, histórico e oportunidades por organização."
        actions={
          <Button leftIcon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
            Novo cliente
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-3 p-3.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary"><Users className="size-4" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Total de clientes</p><p className="text-lg font-extrabold text-ink">{customers?.length ?? "—"}</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-3.5">
          <span className="grid size-9 place-items-center rounded-lg bg-secondary-soft text-secondary"><Building2 className="size-4" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Empresas ativas</p><p className="text-lg font-extrabold text-ink">{new Set((customers ?? []).map((customer) => customer.company).filter(Boolean)).size}</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-3.5">
          <span className="grid size-9 place-items-center rounded-lg bg-tertiary-soft text-tertiary"><Tag className="size-4" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Segmentos</p><p className="text-lg font-extrabold text-ink">{tags.length}</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-3.5">
          <span className="grid size-9 place-items-center rounded-lg bg-warning-soft text-warning"><UserPlus className="size-4" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Novos este mês</p><p className="text-lg font-extrabold text-ink">{(customers ?? []).filter((customer) => new Date(customer.created_at).getMonth() === new Date().getMonth()).length}</p></div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                if (params.get("search")) {
                  params.delete("search");
                  setParams(params, { replace: true });
                }
              }}
              placeholder="Buscar por nome, e-mail, empresa, documento ou telefone…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 flex items-center gap-1 text-[11px] font-semibold text-muted"><Filter className="size-3.5" /> Tags</span>
            <button
              type="button"
              onClick={() => setTag("")}
              className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold transition", tag === "" ? "border-primary bg-primary text-white" : "border-line bg-white text-muted hover:text-ink")}
            >
              Todas
            </button>
            {tags.slice(0, 7).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTag(item === tag ? "" : item)}
                className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold transition", tag === item ? "border-primary bg-primary text-white" : "border-line bg-white text-muted hover:text-ink")}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-14" />)}
          </div>
        ) : customers && customers.length > 0 ? (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface/60 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5">Cliente</th>
                  <th className="px-3 py-2.5">Empresa</th>
                  <th className="px-3 py-2.5">Contacto</th>
                  <th className="px-3 py-2.5">Tags</th>
                  <th className="px-3 py-2.5">Responsável</th>
                  <th className="px-3 py-2.5">Atualizado</th>
                  <th className="px-4 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => navigate(`/clientes/${customer.id}`)}
                    className="cursor-pointer border-b border-line/70 transition last:border-0 hover:bg-primary-soft/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={customer.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink">{customer.name}</p>
                          <p className="flex items-center gap-1 truncate text-[11px] text-muted"><Mail className="size-3" /> {customer.email ?? "sem e-mail"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-ink-soft">{customer.company ?? <span className="text-slate-400">—</span>}</td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-ink-soft">{formatPhone(customer.phone)}</p>
                      <p className="text-[10px] text-muted">{customer.document ?? "—"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex max-w-44 flex-wrap gap-1">
                        {customer.tags.slice(0, 3).map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
                        {customer.tags.length > 3 ? <Badge variant="neutral">+{customer.tags.length - 3}</Badge> : null}
                        {customer.tags.length === 0 ? <span className="text-xs text-slate-400">—</span> : null}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Avatar name={customer.assigned_to_user.full_name} size="xs" />
                        <span className="text-xs text-ink-soft">{customer.assigned_to_user.full_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted">{formatDate(customer.updated_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Abrir WhatsApp"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/whatsapp?cliente=${customer.id}`);
                          }}
                        >
                          <MessageCircle className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Abrir ficha"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/clientes/${customer.id}`);
                          }}
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                        {can("customers:delete") ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir cliente"
                            className="text-danger hover:bg-danger-soft"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!window.confirm(`Excluir o cliente ${customer.name}? Esta ação não pode ser desfeita.`)) return;
                              api
                                .delete(`/customers/${customer.id}`)
                                .then(() => {
                                  toast("Cliente excluído.", "info");
                                  window.location.reload();
                                })
                                .catch((cause: unknown) =>
                                  toast(cause instanceof ApiError ? cause.message : "Não foi possível excluir.", "error"),
                                );
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={<Users className="size-5" />}
              title="Nenhum cliente encontrado"
              description={search || tag ? "Ajuste a busca ou remova os filtros aplicados." : "Cadastre o primeiro cliente para começar a construir o seu pipeline."}
              action={<Button size="sm" leftIcon={<Plus className="size-3.5" />} onClick={() => setOpen(true)}>Novo cliente</Button>}
            />
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={closeModal}
        title="Novo cliente"
        description="Os dados alimentam a IA, as automações e o atendimento WhatsApp."
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" form="customer-form" loading={createCustomer.isPending}>Cadastrar cliente</Button>
          </>
        }
      >
        <form id="customer-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome completo" className="sm:col-span-2">
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} placeholder="Ex.: Lucas Menezes" />
          </Field>
          <Field label="Telefone / WhatsApp" hint="Duplicidades na mesma organização são bloqueadas.">
            <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required placeholder="+55 11 98842-1209" />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="lucas@empresa.com" />
          </Field>
          <Field label="Empresa">
            <Input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="DataCore Sistemas" />
          </Field>
          <Field label="Documento (CNPJ/CPF)">
            <Input value={form.document} onChange={(event) => setForm({ ...form, document: event.target.value })} placeholder="12.345.678/0001-90" />
          </Field>
          <Field label="Tags" hint="Separe por vírgulas." className="sm:col-span-2">
            <Input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="Enterprise, B2B, TomadorDeDecisão" />
          </Field>
          {team && team.length > 0 ? (
            <Field label="Responsável" className="sm:col-span-2">
              <Select value={form.assigned_to} onChange={(event) => setForm({ ...form, assigned_to: event.target.value })}>
                <option value="">Atribuir a mim</option>
                {team.map((member) => <option key={member.user_id} value={member.user_id}>{member.user.full_name} · {member.role}</option>)}
              </Select>
            </Field>
          ) : null}
          <Field label="Notas internas" className="sm:col-span-2">
            <Textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Contexto comercial, preferências, histórico…" />
          </Field>
          {error ? <div className="sm:col-span-2 rounded-xl border border-red-200 bg-danger-soft px-3 py-2.5 text-sm font-medium text-red-700">{error}</div> : null}
        </form>
      </Modal>
    </div>
  );
}
