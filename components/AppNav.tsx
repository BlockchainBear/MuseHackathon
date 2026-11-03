"use client";

import React from "react";
import { Logo } from "./ui";
import { FolderIcon, MapIcon, PlusIcon } from "./icons";

export type ShellView = "create" | "workspace" | "saved";

const TABS: { id: ShellView; label: string; icon: React.ReactNode }[] = [
  { id: "create", label: "New", icon: <PlusIcon className="h-4 w-4" /> },
  { id: "workspace", label: "Workspace", icon: <MapIcon className="h-4 w-4" /> },
  { id: "saved", label: "Saved", icon: <FolderIcon className="h-4 w-4" /> },
];

/** Persistent app chrome: logo, section tabs, and the open world's name. */
export function AppNav({
  view,
  docOpen,
  worldName,
  onNavigate,
}: {
  view: ShellView;
  docOpen: boolean;
  worldName: string | null;
  onNavigate: (v: ShellView) => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-forge-line bg-forge-bg/95 backdrop-blur">
      <div className="nice-scroll mx-auto flex w-full max-w-7xl items-center gap-1 overflow-x-auto px-3 py-2 sm:gap-2 sm:px-4">
        <span className="mr-1 shrink-0 sm:hidden">
          <Logo compact />
        </span>
        <span className="mr-1 hidden shrink-0 sm:block">
          <Logo />
        </span>
        <nav className="flex items-center gap-1" aria-label="Sections">
          {TABS.map((t) => {
            const active = view === t.id;
            const disabled = t.id === "workspace" && !docOpen;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onNavigate(t.id)}
                disabled={disabled}
                aria-current={active ? "page" : undefined}
                title={disabled ? "Open or generate a world first" : t.label}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:px-3.5 sm:text-sm ${
                  active
                    ? "bg-cyan-400/10 text-cyan-300"
                    : "text-forge-dim hover:bg-forge-panel2 hover:text-slate-200"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </nav>
        {worldName && (
          <p className="ml-auto hidden min-w-0 truncate pl-3 text-xs text-forge-dim md:block" title={worldName}>
            {worldName}
          </p>
        )}
      </div>
    </header>
  );
}
