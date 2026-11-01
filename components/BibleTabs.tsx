"use client";

import React from "react";
import type { World, WorldDoc } from "@/lib/schema";
import { Button, Label } from "./ui";

type Mutate = (fn: (w: World) => void) => void;

type TabId = "locations" | "npcs" | "quests" | "assets" | "prompts";

const TABS: { id: TabId; label: string }[] = [
  { id: "locations", label: "Locations" },
  { id: "npcs", label: "NPCs" },
  { id: "quests", label: "Quests" },
  { id: "assets", label: "Assets" },
  { id: "prompts", label: "Production Prompts" },
];

function TextRow({
  label,
  value,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-3">
      <Label>{label}</Label>
      <input className="field" value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function AreaRow({
  label,
  value,
  maxLength,
  rows = 3,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  maxLength: number;
  rows?: number;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="mt-3">
      <Label>{label}</Label>
      <textarea
        className="field resize-y"
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="mt-1 text-xs text-forge-dim">{hint}</p>}
    </div>
  );
}

export function BibleTabs({
  doc,
  onEdit,
  onSelectLocation,
}: {
  doc: WorldDoc;
  onEdit: Mutate;
  onSelectLocation: (id: string) => void;
}) {
  const [tab, setTab] = React.useState<TabId>("locations");
  const world = doc.world;

  return (
    <section aria-label="World bible" className="mt-6 rounded-xl border border-forge-line bg-forge-panel">
      <div className="flex gap-1 overflow-x-auto border-b border-forge-line p-2" role="tablist" aria-label="World bible tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-cyan-400/10 text-cyan-300" : "text-forge-dim hover:bg-forge-panel2 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="nice-scroll max-h-[520px] overflow-y-auto p-4 sm:p-5" role="tabpanel">
        {tab === "locations" && (
          <div className="space-y-5">
            {world.locations.map((loc) => (
              <article key={loc.id} className="rounded-lg border border-forge-line bg-forge-bg/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold">
                    <span className="mr-2 font-mono text-xs text-forge-purple">{loc.id}</span>
                    {loc.name}
                  </h3>
                  <Button className="!px-2.5 !py-1 !text-xs" onClick={() => onSelectLocation(loc.id)}>
                    Show on map
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                  <TextRow label="Name" value={loc.name} maxLength={80} onChange={(v) => onEdit((w) => {
                    w.locations.find((l) => l.id === loc.id)!.name = v;
                  })} />
                  <TextRow label="Category" value={loc.category} maxLength={60} onChange={(v) => onEdit((w) => {
                    w.locations.find((l) => l.id === loc.id)!.category = v;
                  })} />
                </div>
                <AreaRow label="Description" value={loc.description} maxLength={1200} rows={3} onChange={(v) => onEdit((w) => {
                  w.locations.find((l) => l.id === loc.id)!.description = v;
                })} />
                <AreaRow
                  label="Key props (one per line)"
                  value={loc.keyProps.join("\n")}
                  maxLength={1300}
                  rows={3}
                  onChange={(v) => onEdit((w) => {
                    w.locations.find((l) => l.id === loc.id)!.keyProps = v.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10);
                  })}
                />
                <AreaRow label="Concept-art prompt" value={loc.imagePrompt} maxLength={1500} rows={2} onChange={(v) => onEdit((w) => {
                  w.locations.find((l) => l.id === loc.id)!.imagePrompt = v;
                })} />
              </article>
            ))}
          </div>
        )}

        {tab === "npcs" && (
          <div className="space-y-5">
            {world.npcs.map((npc) => (
              <article key={npc.id} className="rounded-lg border border-forge-line bg-forge-bg/60 p-4">
                <h3 className="font-bold">
                  <span className="mr-2 font-mono text-xs text-forge-purple">{npc.id}</span>
                  {npc.name} <span className="font-normal text-forge-dim">— {npc.role}</span>
                </h3>
                <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
                  <TextRow label="Name" value={npc.name} maxLength={80} onChange={(v) => onEdit((w) => {
                    w.npcs.find((n) => n.id === npc.id)!.name = v;
                  })} />
                  <TextRow label="Role" value={npc.role} maxLength={120} onChange={(v) => onEdit((w) => {
                    w.npcs.find((n) => n.id === npc.id)!.role = v;
                  })} />
                  <div className="mt-3">
                    <Label>Location</Label>
                    <select
                      className="field"
                      value={npc.locationId}
                      onChange={(e) => onEdit((w) => {
                        w.npcs.find((n) => n.id === npc.id)!.locationId = e.target.value;
                      })}
                    >
                      {world.locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <AreaRow label="Personality" value={npc.personality} maxLength={600} rows={2} onChange={(v) => onEdit((w) => {
                  w.npcs.find((n) => n.id === npc.id)!.personality = v;
                })} />
                <AreaRow label="Dialogue" value={npc.dialogue} maxLength={800} rows={2} onChange={(v) => onEdit((w) => {
                  w.npcs.find((n) => n.id === npc.id)!.dialogue = v;
                })} />
              </article>
            ))}
          </div>
        )}

        {tab === "quests" && (
          <div className="space-y-5">
            <article className="rounded-lg border border-cyan-400/30 bg-forge-bg/60 p-4">
              <h3 className="font-bold">
                <span className="mr-2 rounded bg-cyan-400/15 px-1.5 py-0.5 font-mono text-xs text-cyan-300">MAIN</span>
                {world.mainQuest.title}
              </h3>
              <TextRow label="Title" value={world.mainQuest.title} maxLength={120} onChange={(v) => onEdit((w) => {
                w.mainQuest.title = v;
              })} />
              <AreaRow label="Goal" value={world.mainQuest.goal} maxLength={600} rows={2} onChange={(v) => onEdit((w) => {
                w.mainQuest.goal = v;
              })} />
              <AreaRow
                label="Ordered steps (one per line)"
                value={world.mainQuest.steps.join("\n")}
                maxLength={3600}
                rows={5}
                onChange={(v) => onEdit((w) => {
                  w.mainQuest.steps = v.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 12);
                })}
              />
              <fieldset className="mt-3">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-forge-dim">
                  Referenced locations
                </legend>
                <div className="flex flex-wrap gap-3">
                  {world.locations.map((l) => (
                    <label key={l.id} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={world.mainQuest.locationIds.includes(l.id)}
                        onChange={(e) => onEdit((w) => {
                          const ids = new Set(w.mainQuest.locationIds);
                          if (e.target.checked) ids.add(l.id);
                          else ids.delete(l.id);
                          w.mainQuest.locationIds = [...ids].slice(0, 5);
                        })}
                      />
                      {l.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            </article>

            {world.sideQuests.map((q) => (
              <article key={q.id} className="rounded-lg border border-forge-line bg-forge-bg/60 p-4">
                <h3 className="font-bold">
                  <span className="mr-2 rounded bg-forge-purple/15 px-1.5 py-0.5 font-mono text-xs text-forge-purple">SIDE</span>
                  {q.title}
                </h3>
                <TextRow label="Title" value={q.title} maxLength={120} onChange={(v) => onEdit((w) => {
                  w.sideQuests.find((s) => s.id === q.id)!.title = v;
                })} />
                <AreaRow label="Goal" value={q.goal} maxLength={600} rows={2} onChange={(v) => onEdit((w) => {
                  w.sideQuests.find((s) => s.id === q.id)!.goal = v;
                })} />
                <div className="mt-3 max-w-xs">
                  <Label>Location</Label>
                  <select
                    className="field"
                    value={q.locationId}
                    onChange={(e) => onEdit((w) => {
                      w.sideQuests.find((s) => s.id === q.id)!.locationId = e.target.value;
                    })}
                  >
                    {world.locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.id})
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </div>
        )}

        {tab === "assets" && (
          <div className="space-y-5">
            {world.assets.categories.map((cat, ci) => (
              <article key={`${cat.name}-${ci}`} className="rounded-lg border border-forge-line bg-forge-bg/60 p-4">
                <div className="flex items-end justify-between gap-2">
                  <div className="flex-1">
                    <Label>Category name</Label>
                    <input
                      className="field"
                      value={cat.name}
                      maxLength={80}
                      onChange={(e) => onEdit((w) => {
                        w.assets.categories[ci].name = e.target.value;
                      })}
                    />
                  </div>
                  <Button
                    variant="danger"
                    className="!px-2.5 !py-1.5 !text-xs"
                    disabled={world.assets.categories.length <= 1}
                    onClick={() => onEdit((w) => {
                      if (w.assets.categories.length > 1) w.assets.categories.splice(ci, 1);
                    })}
                  >
                    Remove
                  </Button>
                </div>
                <AreaRow
                  label="Items (one per line)"
                  value={cat.items.join("\n")}
                  maxLength={3900}
                  rows={4}
                  onChange={(v) => onEdit((w) => {
                    w.assets.categories[ci].items = v.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 24);
                  })}
                />
              </article>
            ))}
            <Button
              disabled={world.assets.categories.length >= 10}
              onClick={() => onEdit((w) => {
                if (w.assets.categories.length < 10) {
                  w.assets.categories.push({ name: "New category", items: ["New item"] });
                }
              })}
            >
              + Add category
            </Button>
          </div>
        )}

        {tab === "prompts" && (
          <div className="space-y-5">
            <article className="rounded-lg border border-forge-line bg-forge-bg/60 p-4">
              <h3 className="font-bold">Blender production prompt</h3>
              <AreaRow label="Prompt" value={world.blenderPrompt} maxLength={2500} rows={8} onChange={(v) => onEdit((w) => {
                w.blenderPrompt = v;
              })} />
            </article>
            <article className="rounded-lg border border-forge-line bg-forge-bg/60 p-4">
              <h3 className="font-bold">Unreal production prompt</h3>
              <p className="mt-1 text-xs text-forge-dim">
                Pre-production planning reference only — WorldForge does not export playable Unreal or Fortnite levels.
              </p>
              <AreaRow label="Prompt" value={world.unrealPrompt} maxLength={2500} rows={8} onChange={(v) => onEdit((w) => {
                w.unrealPrompt = v;
              })} />
            </article>
          </div>
        )}
      </div>
    </section>
  );
}
