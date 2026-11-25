import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Database,
  Loader2,
  Lock,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Wand2,
  Zap,
} from "lucide-react";
import { useAiChat, useAiSummarize, useConversations, useLeads, useQualifyLead } from "@/lib/queries";
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, Select } from "@/components/ui";
import { cn, formatCompactCurrency, relativeTime } from "@/lib/utils";
import { useToast } from "@/components/toast";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools?: string[];
  agent?: string;
}

const agents = [
  { id: "support", name: "Suporte", description: "Responde dúvidas e resume atendimentos.", icon: MessageCircle, tone: "bg-primary-soft text-primary", prompt: "Quais conversas estão sem atendimento há mais de 48h?" },
  { id: "sales", name: "Vendas", description: "Qualifica leads com BANT e sugere próximos passos.", icon: Target, tone: "bg-tertiary-soft text-tertiary", prompt: "Qualifique os leads qualificados e mostre o score." },
  { id: "analyst", name: "Analista", description: "Consulta pipeline, receita e desempenho da equipa.", icon: BarChart3, tone: "bg-secondary-soft text-secondary", prompt: "Mostre o pipeline por estágio e a previsão ponderada." },
  { id: "followup", name: "Follow-up", description: "Encontra oportunidades paradas e recomenda ações.", icon: Clock, tone: "bg-warning-soft text-warning", prompt: "Quais oportunidades estão paradas há mais de 48h?" },
] as const;

const suggestions = [
  "Quais conversas estão sem atendimento há mais de 48h?",
  "Resuma a última conversa com o cliente Lucas Menezes",
  "Mostre o pipeline por estágio e a previsão ponderada",
  "Qualifique os leads com maior probabilidade de fechamento",
];

export default function AssistantPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const aiChat = useAiChat();
  const qualify = useQualifyLead();
  const summarize = useAiSummarize();
  const { data: leads } = useLeads();
  const { data: conversations } = useConversations();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Olá! Sou o Nexus Copilot. Posso analisar o pipeline, resumir conversas do WhatsApp, qualificar leads com BANT e identificar oportunidades paradas.\n\nTodas as minhas ações passam por ferramentas autorizadas e respeitam o seu papel na organização. O que quer investigar primeiro?",
      tools: [],
      agent: "analyst",
    },
  ]);
  const [input, setInput] = useState("");
  const [agentId, setAgentId] = useState("support");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState("");
  const [selectedConversation, setSelectedConversation] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({ down: false, startX: 0, scrollLeft: 0 });

  const activeAgent = useMemo(() => agents.find((agent) => agent.id === agentId) ?? agents[0], [agentId]);
  const topLeads = useMemo(() => (leads ?? []).filter((lead) => lead.status !== "lost").slice(0, 30), [leads]);

  function scrollToEnd() {
    window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function send(message = input) {
    const content = message.trim();
    if (!content || aiChat.isPending) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content }]);
    setInput("");
    scrollToEnd();
    aiChat.mutate(
      { message: content },
      {
        onSuccess: (result) => {
          setMessages((current) => [
            ...current,
            { id: result.interaction_id, role: "assistant", content: result.answer, tools: result.tools_used, agent: result.agent_type },
          ]);
          scrollToEnd();
        },
        onError: () => {
          toast("Não foi possível consultar o Copilot.", "error");
          setMessages((current) => [
            ...current,
            { id: crypto.randomUUID(), role: "assistant", content: "Não consegui concluir a análise agora. Tente novamente em instantes.", tools: [] },
          ]);
        },
      },
    );
  }

  function runQualify() {
    if (!selectedLead) {
      toast("Selecione um lead para qualificar.", "error");
      return;
    }
    const lead = leads?.find((item) => item.id === selectedLead);
    qualify.mutate(
      { lead_id: selectedLead },
      {
        onSuccess: (result) => {
          setMessages((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `Lead ${result.customer ?? lead?.title ?? ""} qualificado.\n\nScore: ${result.score}/100 · Probabilidade de fechamento: ${result.probability}%.\n\n${result.reasoning.map((item) => `• ${item}`).join("\n")}\n\nPróximos passos:\n${result.next_steps.map((item) => `• ${item}`).join("\n")}`,
              tools: ["qualify_lead", "create_task"],
              agent: "sales",
            },
          ]);
          toast("Lead qualificado e tarefa criada.");
          scrollToEnd();
        },
        onError: () => toast("Não foi possível qualificar o lead.", "error"),
      },
    );
  }

  function runSummarize() {
    if (!selectedConversation) {
      toast("Selecione uma conversa para resumir.", "error");
      return;
    }
    summarize.mutate(selectedConversation, {
      onSuccess: (result) => {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `${result.summary}\n\n${result.key_points.map((point) => `• ${point}`).join("\n")}`,
            tools: ["summarize_conversation"],
            agent: "support",
          },
        ]);
        scrollToEnd();
      },
      onError: () => toast("Não foi possível resumir a conversa.", "error"),
    });
  }

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 z-20 flex animate-fade-up flex-col bg-surface px-4 py-4 lg:left-[260px] lg:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-primary-soft via-white to-tertiary-soft px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary via-secondary to-tertiary text-white shadow-lg shadow-emerald-200/50">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Nexus Copilot · IA contextual</p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Agente Nexus</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="ai" className="hidden sm:inline-flex">Pro</Badge>
          <Button variant="secondary" size="sm" leftIcon={<Zap className="size-3.5" />} onClick={() => navigate("/automacoes")}>Automações</Button>
          <Button variant="secondary" size="sm" leftIcon={<Bot className="size-3.5" />} onClick={() => setToolsOpen(true)}>Ferramentas</Button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-surface">
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-line bg-gradient-to-r from-primary-soft/60 to-white px-4 py-3">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-tertiary text-white shadow-sm"><Sparkles className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">Copiloto Nexus</p>
              <p className="text-[11px] text-muted">Contexto: {activeAgent?.name} · dados da organização em tempo real</p>
            </div>
            <Badge variant="success"><span className="size-1.5 rounded-full bg-secondary animate-pulse-dot" /> Online</Badge>
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar border-b border-line px-3 py-2">
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => setAgentId(agent.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition",
                  agentId === agent.id ? "border-primary bg-primary text-white" : "border-line bg-white text-muted hover:text-ink",
                )}
              >
                <agent.icon className="size-3" /> {agent.name}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto no-scrollbar bg-[#f7f9fe] px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex gap-2", message.role === "user" ? "justify-end" : "justify-start")}>
                {message.role === "assistant" ? (
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-tertiary text-white"><Sparkles className="size-3.5" /></span>
                ) : null}
                <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed shadow-sm", message.role === "user" ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-line bg-white text-ink-soft")}>
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-code:rounded prose-code:bg-surface-low prose-code:px-1 prose-code:py-0.5 prose-code:text-[11px]">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-line">{message.content}</p>
                  )}
                  {message.tools && message.tools.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-line/70 pt-1.5">
                      {message.tools.map((tool) => <Badge key={tool} variant="outline" className="font-mono text-[9px]">{tool}()</Badge>)}
                    </div>
                  ) : null}
                  {message.agent ? <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-muted">agente {message.agent}</p> : null}
                </div>
                {message.role === "user" ? <Avatar name="Você" size="sm" /> : null}
              </div>
            ))}
            {aiChat.isPending ? (
              <div className="flex items-center gap-2 pl-1 text-xs text-muted">
                <span className="grid size-7 place-items-center rounded-lg bg-primary text-white"><Loader2 className="size-3.5 animate-spin" /></span>
                Analisando dados com ferramentas autorizadas…
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="sticky bottom-0 border-t border-line bg-white/80 p-3 backdrop-blur-md">
            <div
              ref={suggestionsRef}
              className="mb-2 flex cursor-grab gap-1.5 overflow-x-auto no-scrollbar active:cursor-grabbing"
              onMouseDown={(event) => {
                const el = suggestionsRef.current;
                if (!el) return;
                dragState.current = { down: true, startX: event.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
              }}
              onMouseLeave={() => { dragState.current.down = false; }}
              onMouseUp={() => { dragState.current.down = false; }}
              onMouseMove={(event) => {
                const el = suggestionsRef.current;
                if (!el || !dragState.current.down) return;
                event.preventDefault();
                const x = event.pageX - el.offsetLeft;
                const walk = (x - dragState.current.startX) * 1.2;
                el.scrollLeft = dragState.current.scrollLeft - walk;
              }}
            >
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => send(suggestion)} className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-[10px] font-medium text-muted transition hover:border-primary/40 hover:text-primary">
                  {suggestion}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-1.5 rounded-xl border border-line bg-white p-1.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
              <button type="button" onClick={() => toast("Anexos em breve.", "info")} className="rounded-lg p-1.5 text-muted hover:bg-surface-low" aria-label="Anexar"><Database className="size-4" /></button>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder="Pergunte sobre pipeline, conversas, leads, receita…"
                className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-1.5 text-xs text-ink placeholder:text-slate-400 focus:outline-none"
              />
              <Button size="icon" onClick={() => send()} disabled={!input.trim()} loading={aiChat.isPending} aria-label="Enviar pergunta"><Send className="size-4" /></Button>
            </div>
            <p className="mt-1 px-1 text-[9px] text-muted">A IA só executa ferramentas permitidas para o seu papel. Nenhuma query SQL é gerada ou executada.</p>
          </div>
        </Card>

{toolsOpen ? <button type="button" aria-label="Fechar ferramentas" className="absolute inset-0 z-30 bg-ink/30 backdrop-blur-[1px]" onClick={() => setToolsOpen(false)} /> : null}
        <div className={cn("absolute inset-y-0 right-0 z-40 w-[360px] max-w-[90vw] transition-transform duration-200", toolsOpen ? "translate-x-0" : "translate-x-full")}>
          <div className="h-full overflow-y-auto no-scrollbar bg-surface p-2 space-y-4">
          <Card className="p-4">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Bot className="size-4 text-primary" /> Agentes disponíveis</h2>
            <div className="mt-3 space-y-2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setAgentId(agent.id)}
                  className={cn("flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition", agentId === agent.id ? "border-primary/40 bg-primary-soft/50" : "border-line hover:bg-surface/70")}
                >
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", agent.tone)}><agent.icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-ink">{agent.name}</p>
                    <p className="text-[10px] leading-relaxed text-muted">{agent.description}</p>
                  </div>
                  {agentId === agent.id ? <CheckCircle2 className="mt-0.5 size-3.5 text-primary" /> : null}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><Wand2 className="size-4 text-tertiary" /> Ações rápidas</h2>
            <div className="mt-3 space-y-2.5">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Qualificar lead (BANT)</p>
                <div className="flex gap-1.5">
                  <Select value={selectedLead} onChange={(event) => setSelectedLead(event.target.value)} className="h-9 text-xs">
                    <option value="">Selecione um lead…</option>
                    {topLeads.map((lead) => <option key={lead.id} value={lead.id}>{lead.customer?.name ?? lead.title}</option>)}
                  </Select>
                  <Button size="icon" variant="ai" onClick={runQualify} loading={qualify.isPending} aria-label="Qualificar"><Sparkles className="size-3.5" /></Button>
                </div>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Resumir conversa</p>
                <div className="flex gap-1.5">
                  <Select value={selectedConversation} onChange={(event) => setSelectedConversation(event.target.value)} className="h-9 text-xs">
                    <option value="">Selecione uma conversa…</option>
                    {(conversations ?? []).slice(0, 30).map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.customer_name}</option>)}
                  </Select>
                  <Button size="icon" variant="ai" onClick={runSummarize} loading={summarize.isPending} aria-label="Resumir"><CheckCircle2 className="size-3.5" /></Button>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                leftIcon={<CircleDollarSign className="size-3.5" />}
                onClick={() => {
                  const open = (leads ?? []).filter((lead) => lead.status === "qualified").length;
                  setMessages((current) => [
                    ...current,
                    { id: crypto.randomUUID(), role: "assistant", content: `Há ${open} leads qualificados e ${(conversations ?? []).length} conversas ativas nesta organização. Priorize os leads com maior valor e follow-up pendente.`, tools: ["get_deals", "get_conversations"], agent: "analyst" },
                  ]);
                  scrollToEnd();
                }}
              >
                Resumo executivo rápido
              </Button>
            </div>
          </Card>

          <Card className="border-emerald-100 bg-secondary-soft/40 p-4">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><ShieldCheck className="size-4 text-secondary" /> Guardrails de segurança</h2>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-ink-soft">
              <li className="flex gap-1.5"><Lock className="mt-0.5 size-3 shrink-0 text-secondary" /> Ferramentas autorizadas por papel (RBAC).</li>
              <li className="flex gap-1.5"><Database className="mt-0.5 size-3 shrink-0 text-secondary" /> Nenhuma query SQL arbitrária é executada.</li>
              <li className="flex gap-1.5"><ShieldCheck className="mt-0.5 size-3 shrink-0 text-secondary" /> Isolamento por organização em todas as leituras.</li>
              <li className="flex gap-1.5"><Zap className="mt-0.5 size-3 shrink-0 text-secondary" /> Envios em modo manual exigem aprovação humana.</li>
            </ul>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink"><ArrowUpRight className="size-4 text-primary" /> Atalhos</h2>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {[
                { label: "Pipeline", to: "/pipeline" },
                { label: "Conversas", to: "/whatsapp" },
                { label: "Leads", to: "/leads" },
                { label: "Relatórios", to: "/relatorios" },
              ].map((item) => (
                <button key={item.to} type="button" onClick={() => navigate(item.to)} className="flex items-center justify-between rounded-lg border border-line bg-white px-2.5 py-2 text-[11px] font-semibold text-ink-soft transition hover:border-primary/30 hover:text-primary">
                  {item.label} <ArrowRight className="size-3" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}
