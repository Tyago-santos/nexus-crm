import {
  forwardRef,
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { cn, initials, textColorForName } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "ai" | "danger" | "dark";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white shadow-sm shadow-indigo-200 hover:bg-primary-strong focus-visible:ring-primary/40",
  secondary: "border border-line bg-white text-ink hover:border-line-strong hover:bg-surface-low focus-visible:ring-primary/30",
  ghost: "text-muted hover:bg-surface-low hover:text-ink focus-visible:ring-primary/20",
  ai: "border border-indigo-200 bg-white text-primary hover:bg-primary-soft focus-visible:ring-primary/30",
  danger: "bg-danger text-white hover:bg-red-600 focus-visible:ring-red-300",
  dark: "bg-ink text-white hover:bg-ink-soft focus-visible:ring-ink/30",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold",
  md: "h-10 gap-2 rounded-xl px-4 text-sm font-semibold",
  lg: "h-11 gap-2 rounded-xl px-5 text-sm font-semibold",
  icon: "size-9 rounded-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, leftIcon, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : leftIcon}
      {children}
    </button>
  );
});

type BadgeVariant = "primary" | "success" | "warning" | "danger" | "ai" | "neutral" | "outline" | "info";

const badgeVariants: Record<BadgeVariant, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-secondary-soft text-emerald-700",
  warning: "bg-warning-soft text-amber-700",
  danger: "bg-danger-soft text-red-700",
  ai: "bg-tertiary-soft text-tertiary",
  neutral: "bg-surface-low text-ink-soft",
  outline: "border border-line bg-white text-muted",
  info: "bg-sky-50 text-sky-700",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-5",
        badgeVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className, ...props }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card-surface", className)} {...props}>
      {children}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink placeholder:text-slate-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:bg-surface-low",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15",
        className,
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full appearance-none rounded-xl border border-line bg-white px-3 pr-8 text-sm text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.75rem center",
      }}
      {...props}
    >
      {children}
    </select>
  );
});

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-danger">{error}</span> : hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-ink/40 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-fade-up",
          size === "sm" && "max-w-md",
          size === "md" && "max-w-xl",
          size === "lg" && "max-w-3xl",
          size === "xl" && "max-w-5xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line bg-gradient-to-r from-primary-soft/60 to-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-low hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-line bg-surface/60 px-5 py-3.5">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Avatar({
  name,
  size = "md",
  online,
  className,
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}) {
  const sizes = {
    xs: "size-6 text-[9px]",
    sm: "size-8 text-[11px]",
    md: "size-10 text-xs",
    lg: "size-14 text-base",
    xl: "size-20 text-xl",
  };
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full font-bold text-white ring-2 ring-white",
          sizes[size],
        )}
        style={{ backgroundColor: textColorForName(name) }}
      >
        {initials(name)}
      </span>
      {online ? (
        <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-secondary" />
      ) : null}
    </span>
  );
}

export function Progress({
  value,
  tone = "primary",
  className,
}: {
  value: number;
  tone?: "primary" | "success" | "warning" | "tertiary";
  className?: string;
}) {
  const colors = {
    primary: "bg-primary",
    success: "bg-secondary",
    warning: "bg-warning",
    tertiary: "bg-tertiary",
  };
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-high", className)}>
      <div
        className={cn("h-full rounded-full transition-all", colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? <div className="mb-2 flex items-center gap-2">{eyebrow}</div> : null}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink lg:text-[28px]">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "primary" | "success" | "tertiary" | "warning" | "info";
  trend?: { value: string; positive?: boolean };
}) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    success: "bg-secondary-soft text-secondary",
    tertiary: "bg-tertiary-soft text-tertiary",
    warning: "bg-warning-soft text-warning",
    info: "bg-sky-50 text-sky-600",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
        {icon ? <span className={cn("grid size-8 place-items-center rounded-lg", tones[tone])}>{icon}</span> : null}
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        {trend ? (
          <span className={cn("font-semibold", trend.positive === false ? "text-danger" : "text-secondary")}>
            {trend.value}
          </span>
        ) : null}
        {hint ? <span className="text-muted">{hint}</span> : null}
      </div>
    </Card>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center">
      {icon ? <div className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">{icon}</div> : null}
      <p className="mt-1 text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? "Alternar"}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50",
        checked ? "bg-primary" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 transform rounded-full bg-white shadow transition",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: Array<{ id: string; label: string; count?: number }>;
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1 rounded-xl bg-surface-low p-1", className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
            value === item.id ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {item.label}
          {item.count !== undefined ? (
            <span className={cn("rounded-full px-1.5 text-[10px]", value === item.id ? "bg-primary-soft text-primary" : "bg-white text-muted")}>
              {item.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-high", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-primary", className)} />;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}
