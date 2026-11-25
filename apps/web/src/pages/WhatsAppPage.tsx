import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Bot,
  Check,
  CheckCheck,
  ChevronLeft,
  Clock,
  FileText,
  Filter,
  Menu,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Phone,
  Plus,
  QrCode,
  Search,
  Send,
  Settings2,
  Smile,
  Sparkles,
  Tag,
  UserRound,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/app/auth";
import {
  useAccounts,
  useAiSummarize,
  useAiSuggestion,
  useConversations,
  useCustomer,
  useDeals,
  useMarkRead,
  useMessages,
  useSendMessage,
  useSetAiMode,
  useTeam,
  useTransferConversation,
} from "@/lib/queries";
import { Avatar, Badge, Button, Card, EmptyState, Field, Modal, Progress, Select, Skeleton, Textarea } from "@/components/ui";
import { cn, formatCompactCurrency, formatPhone, formatTime, relativeTime, stageLabel } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { WhatsAppConnectModal } from "@/components/WhatsAppConnect";
import type { AiSummary, ConversationRow } from "@/lib/types";

const filterTabs = [
  { id: "all", label: "Todas" },
  { id: "unread", label: "Não lidas" },
  { id: "ai", label: "Aguardando IA" },
  { id: "tags", label: "Com tags" },
];

const modeLabels: Record<string, string> = {
  manual: "Manual",
  copilot: "Copiloto",
  automatic: "Automático",
};

export default function WhatsAppPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { can, session } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(params.get("conversa"));
  const [listOpen, setListOpen] = useState(Boolean(params.get("conversa") || params.get("cliente")));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [text, setText] = useState("");
  const [suggestionEnabled, setSuggestionEnabled] = useState(false);
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [connectOpen, setConnectOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { data: conversations, isLoading: loadingConversations } = useConversations(search);
  const { data: accounts } = useAccounts();
  const { data: messages, isLoading: loadingMessages } = useMessages(selectedId);
  const { data: suggestion, isFetching: loadingSuggestion, error: suggestionError } = useAiSuggestion(selectedId, suggestionEnabled);
  const { data: team } = useTeam(can("team:manage"));
  const { data: deals } = useDeals();
  const summarize = useAiSummarize();
  const sendMessage = useSendMessage();
  const markRead = useMarkRead();
  const setAiMode = useSetAiMode();
  const transfer = useTransferConversation();

  const selected = useMemo(() => {
    const list = conversations ?? [];
    return list.find((conversation) => conversation.id === selectedId) ?? list[0] ?? null;
  }, [conversations, selectedId]);
  const activeId = selected?.id ?? null;

  const { data: customer } = useCustomer(selected?.customer_id ?? undefined);

  const filtered = useMemo(() => {
    const list = conversations ?? [];
    switch (tab) {
      case "unread":
        return list.filter((conversation) => conversation.unread_count > 0);
      case "ai":
        return list.filter((conversation) => conversation.ai_mode === "automatic" || conversation.ai_mode === "copilot");
      case "tags":
        return list.filter((conversation) => conversation.tags.length > 0);
      default:
        return list;
    }
  }, [conversations, tab]);

  useEffect(() => {
    if (!selectedId && conversations && conversations.length > 0) {
      setSelectedId(conversations[0]?.id ?? null);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    if (params.get("cliente") && conversations) {
      const found = conversations.find((conversation) => conversation.customer_id === params.get("cliente"));
      if (found) {
        setSelectedId(found.id);
        setListOpen(false);
      }
    }
  }, [params, conversations]);

  useEffect(() => {
    if (activeId) markRead.mutate(activeId);
    setSuggestionEnabled(false);
    setShowSummary(false);
    setSummary(null);
    setTransferTo("");
  }, [activeId]);

  useEffect(() => {
    if (!suggestionEnabled || !suggestion) return;
  }, [suggestion, suggestionEnabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, activeId]);

  const activeDeal = useMemo(() => {
    if (!selected) return null;
    return (
      [...(deals ?? [])]
        .filter((deal) => deal.customer_id === selected.customer_id && !["won", "lost"].includes(deal.stage))
        .sort((a, b) => b.value - a.value)[0] ?? null
    );
  }, [deals, selected]);

  const aiMode = selected?.ai_mode ?? "copilot";
  const canConfigure = can("ai:configure");
  const account = accounts?.[0];

  function send() {
    if (!activeId || !text.trim()) return;
    sendMessage.mutate(
      { conversationId: activeId, content: text.trim() },
      {
        onSuccess: () => {
          setText("");
          setSuggestionEnabled(false);
          toast("Mensagem enviada pelo WhatsApp.");
        },
        onError: () => toast("Não foi possível enviar a mensagem.", "error"),
      },
    );
  }

  function runSummary() {
    if (!activeId) return;
    summarize.mutate(activeId, {
      onSuccess: (result) => {
        setSummary(result);
        setShowSummary(true);
      },
      onError: () => toast("Não foi possível resumir a conversa.", "error"),
    });
  }

  function changeMode(mode: "manual" | "copilot" | "automatic") {
    if (!activeId) return;
    setAiMode.mutate(
      { id: activeId, mode },
      {
        onSuccess: () => toast(`Modo de IA alterado para ${modeLabels[mode]}.`, "info"),
        onError: (error) => toast(error instanceof Error ? error.message : "Sem permissão para alterar a IA.", "error"),
      },
    );
  }

  function confirmTransfer() {
    if (!activeId || !transferTo) return;
    transfer.mutate(
      { id: activeId, userId: transferTo },
      {
        onSuccess: () => {
          toast("Conversa transferida.");
          setTransferOpen(false);
        },
        onError: () => toast("Não foi possível transferir a conversa.", "error"),
      },
    );
  }

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 z-20 flex animate-fade-up flex-col bg-surface px-4 py-4 lg:left-[260px] lg:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Atendimento</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">WhatsApp</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={account?.connection_status === "connected" ? "success" : "warning"}>
            <span className="size-1.5 rounded-full bg-current" />
            {account?.connection_status === "connected" ? "API Oficial Conectada" : "Demonstração local"}
          </Badge>
          <Button variant="secondary" size="sm" leftIcon={<QrCode className="size-3.5" />} onClick={() => setConnectOpen(true)}>
            Conectar WhatsApp
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Settings2 className="size-3.5" />} onClick={() => navigate("/configuracoes")}>
            Canais
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-surface">
        <div className={cn("absolute inset-y-0 left-0 z-40 w-[320px] max-w-[85vw] transition-transform duration-200", listOpen ? "translate-x-0" : "-translate-x-full")}>
          <Card className="flex h-full min-h-0 flex-col overflow-hidden shadow-2xl">

          <div className="border-b border-line p-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-secondary-soft text-secondary"><MessageCircle className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">API Oficial Conectada</p>
                <p className="truncate text-[11px] font-semibold text-ink">{account?.phone_number ? formatPhone(account.phone_number) : "Sem número"} · {account?.provider === "meta_cloud" ? "Meta Cloud" : "Instância 01"}</p>
              </div>
              <button type="button" className="rounded p-1 text-muted hover:bg-surface-low" onClick={() => toast("Canal sincronizado.", "info")}><MoreVertical className="size-4" /></button>
            </div>
            <div className="relative mt-2.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar conversas ou contactos…"
                className="h-9 w-full rounded-lg border border-line bg-surface-low/70 pl-8 pr-8 text-xs text-ink placeholder:text-slate-400 focus:border-primary/40 focus:bg-white focus:outline-none"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line bg-white px-1 text-[9px] text-slate-400">/</kbd>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {filterTabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn("rounded-full px-2 py-1 text-[10px] font-semibold transition", tab === item.id ? "bg-primary text-white" : "bg-surface-low text-muted hover:text-ink")}
                >
                  {item.label}
                  {item.id === "unread" ? ` ${(conversations ?? []).filter((conversation) => conversation.unread_count > 0).length}` : ""}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="space-y-2 p-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="p-3"><EmptyState icon={<MessageCircle className="size-5" />} title="Sem conversas" description="Nenhuma conversa corresponde ao filtro." /></div>
            ) : (
              filtered.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  selected={conversation.id === activeId}
                  onClick={() => {
                    setSelectedId(conversation.id);
                    setListOpen(false);
                  }}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      {listOpen ? <button type="button" aria-label="Fechar conversas" className="absolute inset-0 z-30 bg-ink/30 backdrop-blur-[1px]" onClick={() => setListOpen(false)} /> : null}

      <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                <Button variant="ghost" size="icon" onClick={() => setListOpen(true)} aria-label="Abrir conversas">
                  <Menu className="size-4.5" />
                </Button>
                <Avatar name={selected.customer_name} size="sm" online />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-ink">{selected.customer_name}</p>
                  <p className="truncate text-[10px] text-muted">{selected.customer_company ?? "Contacto WhatsApp"} · {selected.customer_phone ? formatPhone(selected.customer_phone) : "Grupo"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDetailsOpen(true)} aria-label="Abrir detalhes do contacto">
                  <UserRound className="size-4.5" />
                </Button>
                <div className="hidden items-center gap-1.5 lg:flex">
                  <Button variant="secondary" size="sm" leftIcon={<Sparkles className="size-3" />} loading={summarize.isPending} onClick={runSummary}>Resumir</Button>
                  <Button variant="secondary" size="sm" leftIcon={<ArrowUpRight className="size-3" />} onClick={() => navigate("/pipeline")}>Avançar Pipeline</Button>
                  <Button variant="secondary" size="sm" disabled={!can("conversations:write")} leftIcon={<Users className="size-3" />} onClick={() => setTransferOpen(true)}>Transferir</Button>
                  <Button variant="ghost" size="icon" aria-label="Mais opções" onClick={() => toast("Use o painel do contacto para ver detalhes.", "info")}><MoreVertical className="size-4" /></Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-surface/60 px-3 py-1.5">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted"><Bot className="size-3" /> IA:</span>
                {(["manual", "copilot", "automatic"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={!canConfigure || setAiMode.isPending}
                    onClick={() => changeMode(mode)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold transition disabled:opacity-60",
                      aiMode === mode ? "bg-primary text-white" : "bg-white text-muted hover:text-ink",
                    )}
                  >
                    {modeLabels[mode]}
                  </button>
                ))}
                {!canConfigure ? <span className="text-[9px] text-muted">Somente gestores alteram o modo.</span> : null}
                {aiMode === "automatic" ? <Badge variant="ai"><Zap className="size-2.5" /> Respostas automáticas ativas</Badge> : null}
                {selected.unread_count > 0 ? <Badge variant="danger">{selected.unread_count} não lidas</Badge> : null}
              </div>

              {showSummary && summary ? (
                <div className="border-b border-indigo-100 bg-primary-soft/60 px-3 py-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-primary text-white"><Sparkles className="size-3" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-primary">Resumo Nexus AI</p>
                      <p className="whitespace-pre-line text-[11px] leading-relaxed text-ink-soft">{summary.summary}</p>
                      <p className="mt-1 text-[10px] font-semibold text-primary/80">Análise preditiva · {summary.messages_count} mensagens</p>
                    </div>
                    <button type="button" onClick={() => setShowSummary(false)} className="rounded p-1 text-muted hover:bg-white"><X className="size-3.5" /></button>
                  </div>
                </div>
              ) : null}

              <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f8fd] px-3 py-3">
                {loadingMessages ? (
                  <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className={cn("h-16", index % 2 ? "ml-auto w-2/3" : "w-2/3")} />)}</div>
                ) : (
                  <>
                    {(messages ?? []).map((message, index) => {
                      const previous = messages?.[index - 1];
                      const showDivider = !previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString();
                      const outbound = message.direction === "outbound";
                      return (
                        <div key={message.id}>
                          {showDivider ? (
                            <div className="my-3 flex justify-center">
                              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-muted shadow-sm">
                                {new Date(message.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                              </span>
                            </div>
                          ) : null}
                          <div className={cn("mb-2 flex", outbound ? "justify-end" : "justify-start")}>
                            <div
                              className={cn(
                                "max-w-[82%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed shadow-sm",
                                outbound ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-line bg-white text-ink-soft",
                              )}
                            >
                              <p className="whitespace-pre-line">{message.content ?? "[mídia]"}</p>
                              <div className={cn("mt-1 flex items-center justify-end gap-1 text-[9px]", outbound ? "text-white/70" : "text-muted")}>
                                {formatTime(message.created_at)}
                                {outbound ? <CheckCheck className="size-3" /> : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {messages && messages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                        <span className="grid size-12 place-items-center rounded-full bg-white text-primary shadow-sm"><MessageCircle className="size-5" /></span>
                        <p className="text-xs font-semibold text-ink">Nenhuma mensagem ainda</p>
                        <p className="max-w-56 text-[11px] text-muted">Envie a primeira mensagem ou use o Copiloto para sugerir uma abordagem.</p>
                      </div>
                    ) : null}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {suggestionEnabled ? (
                <div className="border-t border-indigo-100 bg-primary-soft/50 px-3 py-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-tertiary text-white"><Sparkles className="size-3" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-tertiary">Sugestão Nexus AI</p>
                        {suggestion ? <Badge variant="ai">{Math.round((suggestion.confidence ?? 0.94) * 100)}% confiança</Badge> : null}
                      </div>
                      {loadingSuggestion ? (
                        <p className="mt-1 text-[11px] text-muted">A analisar a conversa…</p>
                      ) : suggestionError ? (
                        <p className="mt-1 text-[11px] text-danger">Não foi possível gerar a sugestão.</p>
                      ) : (
                        <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-ink-soft">{suggestion?.suggestion}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button size="sm" variant="ai" onClick={() => { if (suggestion) setText(suggestion.suggestion); }}>Inserir</Button>
                      <Button size="sm" onClick={() => { if (suggestion) sendMessage.mutate({ conversationId: selected.id, content: suggestion.suggestion }, { onSuccess: () => { toast("Sugestão enviada."); setSuggestionEnabled(false); } }); }}>Enviar</Button>
                      <button type="button" onClick={() => setSuggestionEnabled(false)} className="text-[9px] font-semibold text-muted hover:text-ink">Fechar</button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="border-t border-line p-2.5">
                <div className="flex items-end gap-1.5 rounded-xl border border-line bg-white p-1.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
                  <button type="button" className="rounded-lg p-1.5 text-muted hover:bg-surface-low" onClick={() => toast("Anexos chegam na próxima fase.", "info")} aria-label="Anexar"><Plus className="size-4" /></button>
                  <button type="button" className="hidden rounded-lg p-1.5 text-muted hover:bg-surface-low sm:block" onClick={() => toast("Templates disponíveis em breve.", "info")} aria-label="Templates"><FileText className="size-4" /></button>
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    placeholder="Digite uma mensagem ou use / para comandos"
                    className="max-h-24 min-h-8 flex-1 resize-none bg-transparent px-1 py-1.5 text-xs text-ink placeholder:text-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setSuggestionEnabled(true)}
                    disabled={loadingSuggestion}
                    className="rounded-lg p-1.5 text-tertiary transition hover:bg-tertiary-soft"
                    aria-label="Sugerir com IA"
                    title="Sugerir resposta com IA"
                  >
                    <Wand2 className={cn("size-4", loadingSuggestion && "animate-pulse")} />
                  </button>
                  <button type="button" className="hidden rounded-lg p-1.5 text-muted hover:bg-surface-low sm:block" onClick={() => toast("Emojis em breve.", "info")} aria-label="Emoji"><Smile className="size-4" /></button>
                  <button type="button" className="hidden rounded-lg p-1.5 text-muted hover:bg-surface-low sm:block" onClick={() => toast("Áudio em breve.", "info")} aria-label="Áudio"><Phone className="size-4" /></button>
                  <Button size="icon" onClick={send} loading={sendMessage.isPending} disabled={!text.trim()} aria-label="Enviar mensagem"><Send className="size-4" /></Button>
                </div>
                <div className="mt-1 flex items-center justify-between px-1 text-[9px] text-muted">
                  <span>Enter envia · Shift+Enter quebra linha</span>
                  <span className="flex items-center gap-1"><CheckCheck className="size-2.5" /> Criptografia de ponta a ponta</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6"><EmptyState icon={<MessageCircle className="size-5" />} title="Selecione uma conversa" description="Escolha uma conversa à esquerda para começar o atendimento." /></div>
          )}
        </Card>

{detailsOpen ? <button type="button" aria-label="Fechar detalhes" className="absolute inset-0 z-30 bg-ink/30 backdrop-blur-[1px]" onClick={() => setDetailsOpen(false)} /> : null}
        <div className={cn("absolute inset-y-0 right-0 z-40 w-[318px] max-w-[85vw] transition-transform duration-200", detailsOpen ? "translate-x-0" : "translate-x-full")}>
          <div className="h-full overflow-y-auto bg-surface p-2">
          {selected ? (
            <>
              <Card className="p-4">
                <div className="flex flex-col items-center text-center">
                  <Avatar name={selected.customer_name} size="xl" online />
                  <p className="mt-2 font-display text-base font-bold text-ink">{selected.customer_name}</p>
                  <p className="text-[11px] text-muted">{selected.customer_company ?? "Empresa não informada"}</p>
                  <Badge variant="outline" className="mt-1.5">Cliente WhatsApp</Badge>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {[
                    { icon: Phone, label: "Ligar" },
                    { icon: MessageCircle, label: "WhatsApp" },
                    { icon: UserRound, label: "Ficha" },
                    { icon: FileText, label: "Notas" },
                  ].map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => {
                        if (action.label === "Ficha" && selected.customer_id) navigate(`/clientes/${selected.customer_id}`);
                        else toast(`${action.label} em breve.`, "info");
                      }}
                      className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface/50 py-2 text-[9px] font-semibold text-muted transition hover:border-primary/30 hover:text-primary"
                    >
                      <action.icon className="size-3.5" />
                      {action.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 space-y-2 border-t border-line pt-3 text-[11px]">
                  <p className="flex items-center gap-2 text-ink-soft"><Phone className="size-3.5 text-slate-400" /> {formatPhone(selected.customer_phone)}</p>
                  <p className="flex items-center gap-2 text-ink-soft"><FileText className="size-3.5 text-slate-400" /> {customer?.email ?? "e-mail não informado"}</p>
                  <p className="flex items-center gap-2 text-ink-soft"><Tag className="size-3.5 text-slate-400" /> {customer?.document ?? "documento não informado"}</p>
                </div>
              </Card>

              {activeDeal ? (
                <Card className="border-indigo-100 bg-gradient-to-br from-primary-soft/70 to-white p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Oportunidade ativa</p>
                    <Badge variant="success">Score {Math.min(99, activeDeal.probability + 18)}</Badge>
                  </div>
                  <p className="mt-1 text-xs font-bold text-ink">{activeDeal.title}</p>
                  <p className="text-lg font-extrabold text-primary">{formatCompactCurrency(activeDeal.value)} <span className="text-[10px] font-medium text-muted">/ano</span></p>
                  <div className="mt-1 flex items-center justify-between text-[10px]"><span className="text-muted">Estágio atual:</span><Badge variant="warning">{stageLabel(activeDeal.stage)}</Badge></div>
                  <Progress value={activeDeal.probability} tone="tertiary" className="mt-1.5 h-1.5" />
                  <p className="mt-1 text-[10px] text-muted">Probabilidade de fechamento: <strong className="text-ink">{activeDeal.probability}%</strong></p>
                  <Button variant="secondary" size="sm" className="mt-2.5 w-full" onClick={() => navigate("/pipeline")}>Abrir oportunidade</Button>
                </Card>
              ) : (
                <Card className="p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Oportunidade ativa</p>
                  <p className="mt-1 text-xs text-muted">Nenhuma oportunidade aberta. Avance o pipeline para acompanhar a receita deste contacto.</p>
                  <Button variant="secondary" size="sm" className="mt-2 w-full" leftIcon={<Plus className="size-3" />} onClick={() => navigate("/pipeline?novo=1")}>Criar oportunidade</Button>
                </Card>
              )}

              <Card className="p-3.5">
                <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Marcadores de inteligência</p><Sparkles className="size-3 text-tertiary" /></div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {[...new Set([...(selected.tags ?? []), ...(customer?.tags ?? [])])].map((tag, index) => (
                    <Badge key={`${tag}-${index}`} variant={index % 3 === 0 ? "ai" : index % 3 === 1 ? "primary" : "success"}>{tag}</Badge>
                  ))}
                  {selected.tags.length === 0 && (customer?.tags.length ?? 0) === 0 ? <span className="text-[11px] text-muted">Sem marcadores.</span> : null}
                </div>
              </Card>

              <Card className="p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Notas internas da equipa</p>
                  <button type="button" className="text-[10px] font-bold text-primary" onClick={() => toast("Notas internas editáveis na ficha do cliente.", "info")}>+ Adicionar</button>
                </div>
                <p className="mt-2 rounded-lg bg-surface-low/80 p-2 text-[11px] leading-relaxed text-ink-soft">
                  {customer?.notes ?? "Sem notas internas. Use a ficha do cliente para registar contexto comercial."}
                </p>
                <p className="mt-1 text-[9px] text-muted">Por {session?.user.full_name} · {relativeTime(new Date().toISOString())}</p>
              </Card>

              <Card className="p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Linha do tempo CRM</p>
                <div className="mt-2 space-y-2">
                  {(customer?.activities ?? []).slice(0, 4).map((activity) => (
                    <div key={activity.id} className="flex gap-2">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-secondary" />
                      <div>
                        <p className="line-clamp-2 text-[10px] font-medium text-ink-soft">{activity.description}</p>
                        <p className="text-[9px] text-muted">{relativeTime(activity.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  {(customer?.activities ?? []).length === 0 ? <p className="text-[10px] text-muted">Sem atividades.</p> : null}
                </div>
                {selected.customer_id ? (
                  <Button variant="secondary" size="sm" className="mt-2.5 w-full" onClick={() => navigate(`/clientes/${selected.customer_id}`)}>Abrir Ficha Completa do Cliente</Button>
                ) : null}
              </Card>
            </>
          ) : null}
        </div>
      </div>

      </div>
      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transferir conversa"
        description="Escolha um membro da equipa para assumir o atendimento."
        footer={<><Button variant="secondary" onClick={() => setTransferOpen(false)}>Cancelar</Button><Button onClick={confirmTransfer} disabled={!transferTo} loading={transfer.isPending}>Transferir</Button></>}
      >
        {team && team.length > 0 ? (
          <div className="space-y-2">
            <Field label="Responsável">
              <Select value={transferTo} onChange={(event) => setTransferTo(event.target.value)}>
                <option value="">Selecione um membro…</option>
                {team.map((member) => <option key={member.user_id} value={member.user_id}>{member.user.full_name} · {member.role}</option>)}
              </Select>
            </Field>
            <div className="space-y-1.5">
              {team.map((member) => (
                <button key={member.user_id} type="button" onClick={() => setTransferTo(member.user_id)} className={cn("flex w-full items-center gap-2 rounded-lg border p-2 text-left transition", transferTo === member.user_id ? "border-primary bg-primary-soft/60" : "border-line hover:bg-surface")}>
                  <Avatar name={member.user.full_name} size="sm" />
                  <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-ink">{member.user.full_name}</p><p className="text-[10px] capitalize text-muted">{member.role}</p></div>
                  {transferTo === member.user_id ? <Check className="size-4 text-primary" /> : null}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">A gestão de equipa exige permissão de gestor. Peça ao administrador para transferir esta conversa.</p>
        )}
      </Modal>
      <WhatsAppConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
    </div>
  );
}

function ConversationItem({ conversation, selected, onClick }: { conversation: ConversationRow; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2 border-b border-line/60 px-2.5 py-2.5 text-left transition last:border-0",
        selected ? "bg-primary-soft/70" : "hover:bg-surface-low/70",
      )}
    >
      <Avatar name={conversation.customer_name} size="sm" online={conversation.status === "open"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p className="truncate text-xs font-bold text-ink">{conversation.customer_name}</p>
          <span className="shrink-0 text-[9px] text-muted">{formatTime(conversation.last_message_at)}</span>
        </div>
        <p className="truncate text-[10px] text-muted">{conversation.last_message || "Sem mensagens"}</p>
        <div className="mt-1 flex items-center gap-1">
          {conversation.customer_company ? <Badge variant="outline" className="max-w-28 truncate">{conversation.customer_company}</Badge> : null}
          {conversation.ai_mode !== "manual" ? <Badge variant="ai">IA {conversation.ai_mode === "automatic" ? "Auto" : "Copiloto"}</Badge> : null}
          {conversation.unread_count > 0 ? <span className="ml-auto grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-white">{conversation.unread_count}</span> : null}
        </div>
      </div>
    </button>
  );
}
