"use client";

import React from "react";

/* ------------------------------ buttons ------------------------------ */

type Variant = "primary" | "accent" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary: "bg-cyan-400 text-slate-950 hover:bg-cyan-300 disabled:hover:bg-cyan-400 font-semibold",
  accent:
    "bg-transparent border border-forge-purple/70 text-forge-purple hover:bg-forge-purple/10 font-semibold",
  ghost: "bg-transparent border border-forge-line text-slate-200 hover:bg-forge-panel2",
  danger: "bg-transparent border border-red-500/70 text-red-300 hover:bg-red-500/10",
};

export function Button({
  variant = "ghost",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClass[variant]} ${className}`}
      {...props}
    />
  );
}

/* ------------------------------ fields ------------------------------ */

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-forge-dim">
      {children}
    </label>
  );
}

export function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="mt-3 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
      {message}
    </div>
  );
}

export function Spinner({ label = "Working…" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <span
        aria-hidden
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-forge-line border-t-cyan-400"
      />
      <span className="text-sm text-forge-dim">{label}</span>
    </span>
  );
}

/* ------------------------------ badges ------------------------------ */

export function SourceBadge({ source }: { source: "live" | "sample" | "imported" }) {
  const styles: Record<string, string> = {
    live: "border-cyan-400/50 bg-cyan-400/10 text-cyan-300",
    sample: "border-amber-400/50 bg-amber-400/10 text-amber-300",
    imported: "border-forge-purple/60 bg-forge-purple/10 text-forge-purple",
  };
  const labels: Record<string, string> = {
    live: "LIVE-GENERATED",
    sample: "SAMPLE DEMO",
    imported: "IMPORTED",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider ${styles[source]}`}>
      {labels[source]}
    </span>
  );
}

export function UsageWarning({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`text-amber-200/90 ${compact ? "text-xs" : "text-sm"}`} role="note">
      <span aria-hidden>⚠ </span>
      {compact
        ? "Uses your Meta Model API key. Requests may incur charges."
        : "Generation uses your private Meta Model API key and may incur charges. Requests fire only when you click — never automatically."}
    </p>
  );
}

/* ------------------------------ modal ------------------------------ */

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-forge-line bg-forge-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md px-2 py-1 text-xl leading-none text-forge-dim hover:bg-forge-panel2 hover:text-white"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
