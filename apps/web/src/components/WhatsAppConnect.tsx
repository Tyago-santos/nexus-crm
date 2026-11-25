import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, MessageCircle, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useAccounts, useConfirmWhatsApp, useConnectWhatsApp, useDisconnectWhatsApp, useWhatsAppQr } from "@/lib/queries";
import { useToast } from "@/components/toast";
import { formatPhone } from "@/lib/utils";

type Phase = "idle" | "loading" | "qr" | "connected";

export function WhatsAppConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("idle");
  const [provider, setProvider] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [demoQr, setDemoQr] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const started = useRef(false);

  const connect = useConnectWhatsApp();
  const confirm = useConfirmWhatsApp();
  const disconnect = useDisconnectWhatsApp();
  const { data: accounts } = useAccounts({ refetchInterval: open ? 2500 : false });
  const account = useMemo(
    () => accounts?.find((item) => item.id === accountId) ?? accounts?.[0],
    [accounts, accountId],
  );
  const isBaileys = provider === "baileys";
  const { data: polledQr } = useWhatsAppQr(accountId, open && isBaileys && phase === "qr");

  const qrValue = isBaileys ? polledQr ?? null : demoQr;
  const connected = account?.connection_status === "connected";

  function start() {
    setPhase("loading");
    setDemoQr(null);
    setExpiresAt(null);
    connect.mutate(undefined, {
      onSuccess: (result) => {
        setProvider(result.provider);
        setAccountId(result.account.id);
        if (result.provider === "meta_cloud" || result.account.connection_status === "connected") {
          setPhase("connected");
          toast("WhatsApp Meta Cloud conectado.");
          return;
        }
        if (result.qr) {
          setDemoQr(result.qr);
          setExpiresAt(Date.now() + 60_000);
          setPhase("qr");
          toast("QR Code gerado. Escaneie com o WhatsApp.");
          return;
        }
        // Baileys: o QR chega de forma assíncrona (socket).
        setPhase("qr");
        toast("A ligar ao WhatsApp. O QR aparecerá em instantes.", "info");
      },
      onError: () => {
        setPhase("idle");
        toast("Não foi possível iniciar a conexão.", "error");
      },
    });
  }

  useEffect(() => {
    if (!open) {
      started.current = false;
      setPhase("idle");
      setDemoQr(null);
      setExpiresAt(null);
      return;
    }
    if (started.current) return;
    started.current = true;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || phase !== "qr") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open, phase]);

  useEffect(() => {
    if (!open) return;
    if (connected) setPhase("connected");
  }, [connected, open]);

  useEffect(() => {
    if (!isBaileys || !polledQr) return;
    setExpiresAt(Date.now() + 60_000);
  }, [isBaileys, polledQr]);

  const secondsLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Conectar WhatsApp"
      description="Leia o QR Code com o WhatsApp do seu telemóvel para ligar o canal à organização."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          {phase === "qr" ? (
            <Button variant="secondary" leftIcon={<RefreshCw className="size-4" />} loading={connect.isPending} onClick={start}>
              Gerar novo QR
            </Button>
          ) : null}
          {phase === "connected" && account ? (
            <Button
              variant="secondary"
              className="text-danger"
              loading={disconnect.isPending}
              onClick={() => disconnect.mutate(account.id, { onSuccess: () => { toast("Canal desconectado.", "info"); setPhase("qr"); } })}
            >
              Desconectar
            </Button>
          ) : null}
          {phase === "qr" && account && !isBaileys ? (
            <Button
              leftIcon={<CheckCircle2 className="size-4" />}
              loading={confirm.isPending}
              onClick={() => confirm.mutate(account.id, {
                onSuccess: () => {
                  toast("Canal WhatsApp conectado.");
                  setPhase("connected");
                },
                onError: () => toast("Não foi possível confirmar a conexão.", "error"),
              })}
            >
              Simular leitura
            </Button>
          ) : null}
          {phase === "connected" ? (
            <Button onClick={onClose}>Concluir</Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col items-center gap-3">
        {phase === "connected" ? (
          <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-secondary-soft/60 px-4 py-6 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-secondary text-white shadow-md shadow-emerald-200">
              <CheckCircle2 className="size-6" />
            </span>
            <p className="font-display text-sm font-bold text-ink">WhatsApp conectado</p>
            <p className="text-xs text-emerald-700">
              {account?.phone_number ? formatPhone(account.phone_number) : "Canal ativo"} · {provider === "meta_cloud" ? "Meta Cloud API" : provider === "baileys" ? "Baileys" : "Demonstração local"}
            </p>
            <p className="max-w-xs text-[11px] leading-relaxed text-muted">
              As mensagens recebidas passam a aparecer na caixa de entrada e a IA atua conforme o modo da conversa.
            </p>
          </div>
        ) : (
          <>
            <div className="relative grid size-52 place-items-center rounded-2xl border border-line bg-white p-3 shadow-sm">
              {qrValue ? (
                <QRCodeSVG
                  value={qrValue}
                  size={176}
                  level="M"
                  marginSize={1}
                  bgColor="#ffffff"
                  fgColor="#0b1c30"
                  title="QR Code para conectar o WhatsApp"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="size-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                  <p className="max-w-[140px] text-[10px] leading-relaxed text-muted">
                    À espera do QR do WhatsApp… mantenha esta janela aberta.
                  </p>
                </div>
              )}
              {secondsLeft !== null ? (
                <span className="absolute -bottom-2.5 rounded-full border border-line bg-white px-2.5 py-1 text-[10px] font-semibold text-muted shadow-sm">
                  {secondsLeft > 0 ? `Expira em ${secondsLeft}s` : "QR expirado"}
                </span>
              ) : null}
            </div>

            {phase === "qr" ? (
              <div className="w-full space-y-2 rounded-xl bg-surface p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Como conectar</p>
                <ol className="space-y-1.5 text-[11px] leading-relaxed text-ink-soft">
                  <li className="flex gap-2"><span className="font-bold text-primary">1.</span> Abra o WhatsApp no telemóvel.</li>
                  <li className="flex gap-2"><span className="font-bold text-primary">2.</span> Toque em <strong>Definições → Dispositivos conectados</strong>.</li>
                  <li className="flex gap-2"><span className="font-bold text-primary">3.</span> Escolha <strong>Conectar dispositivo</strong> e aponte a câmara para o código.</li>
                </ol>
              </div>
            ) : (
              <p className="text-xs text-muted">{phase === "loading" ? "A preparar a ligação…" : ""}</p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-muted">
              <span className="flex items-center gap-1"><Smartphone className="size-3" /> {account?.phone_number ? formatPhone(account.phone_number) : "Sem número"}</span>
              <span className="flex items-center gap-1"><ShieldCheck className="size-3" /> Sessão cifrada</span>
              <span className="flex items-center gap-1"><MessageCircle className="size-3" /> {provider === "demo" || !provider ? "Demonstração local" : provider}</span>
            </div>

            {provider === "demo" || !provider ? (
              <p className="max-w-sm text-center text-[10px] leading-relaxed text-muted">
                Modo demonstração: o QR é ilustrativo. Para um emparelhamento real, configure
                <code className="mx-1 rounded bg-surface px-1 py-0.5">WHATSAPP_PROVIDER=baileys</code>
                localmente ou <code className="mx-1 rounded bg-surface px-1 py-0.5">meta_cloud</code> em produção.
              </p>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}
