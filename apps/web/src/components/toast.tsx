import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = nextId++;
      setItems((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg animate-fade-up",
              item.tone === "success" && "border-emerald-200 bg-white text-emerald-900",
              item.tone === "error" && "border-red-200 bg-white text-red-900",
              item.tone === "info" && "border-indigo-200 bg-white text-indigo-900",
            )}
          >
            {item.tone === "success" && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-secondary" />}
            {item.tone === "error" && <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />}
            {item.tone === "info" && <Info className="mt-0.5 size-4 shrink-0 text-primary" />}
            <p className="flex-1 leading-relaxed">{item.message}</p>
            <button type="button" onClick={() => dismiss(item.id)} className="text-muted transition hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return context;
}
