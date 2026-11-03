"use client";

import React from "react";
import type { Platform, World, WorldDoc } from "@/lib/schema";
import { PLATFORM_META, buildPlatformPack } from "@/lib/platforms";
import { CATEGORY_COLORS } from "@/lib/scene-utils";
import { Button, Label, PickChip } from "./ui";
import { SpeakButton } from "./SpeechControls";
import { PLATFORM_ICONS } from "./CreateView";
import {
  BoxIcon,
  CheckIcon,
  CheckSquareIcon,
  ChevronDownIcon,
  CompassIcon,
  CopyIcon,
  EyeIcon,
  MapPinIcon,
  MessageIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "./icons";

type Mutate = (fn: (w: World) => void) => void;
type MutateDoc = (fn: (d: WorldDoc) => void) => void;

type TabId = "locations" | "npcs" | "quests" | "assets" | "prompts" | "platforms";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "locations", label: "Places", icon: <MapPinIcon className="h-4 w-4" /> },
  { id: "npcs", label: "Cast", icon: <UsersIcon className="h-4 w-4" /> },
  { id: "quests", label: "Quests", icon: <CompassIcon className="h-4 w-4" /> },
  { id: "assets", label: "Assets", icon: <CheckSquareIcon className="h-4 w-4" /> },
  { id: "prompts", label: "Build", icon: <BoxIcon className="h-4 w-4" /> },
  {
    id: "platforms",
    label: "Platforms",
    icon: (
      <span className="flex items-center" aria-hidden>
        {PLATFORM_ICONS.horizon}
      </span>
    ),
  },
];

const ALL_PLATFORMS: Platform[] = ["horizon", "roblox", "fortnite"];

const KIND_OPTIONS = [
  "Market",
  "Village",
  "City",
  "Tavern",
  "Temple",
  "Dungeon",
  "Ruins",
  "Forest",
  "Harbor",
  "Castle",
  "Camp",
  "Tower",
];

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function CountBadge({ n, label }: { n: number; label: string }) {
  return (
    <span className="tabular rounded-full bg-forge-panel2 px-2 py-0.5 text-[11px] font-bold text-forge-dim">
      {n} {label}
    </span>
  );
}

/** Tap-a-place picker: numbered dots match the map nodes. */
function PlaceChips({
  locations,
  value,
  onPick,
  label,
}: {
  locations: { id: string; name: string }[];
  value: string;
  onPick: (id: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {locations.map((l, i) => (
        <PickChip key={l.id} selected={l.id === value} onClick={() => onPick(l.id)} title={l.name}>
          <span
            aria-hidden
            className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-slate-950"
            style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
          >
            {i + 1}
          </span>
          <span className="max-w-28 truncate">{l.name}</span>
        </PickChip>
      ))}
    </div>
  );
}

/** String-list editor: tap × to remove, type + Add for new entries. */
function ChipListEditor({
  items,
  onChange,
  addPlaceholder,
  max,
  removeLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  addPlaceholder: string;
  max: number;
  removeLabel: (item: string) => string;
}) {
  const [draft, setDraft] = React.useState("");
  const commit = () => {
    const v = draft.trim();
    if (!v || items.length >= max) return;
    onChange([...items, v.slice(0, 130)]);
    setDraft("");
  };
  return (
    <div>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Current entries">
          {items.map((item, i) => (
            <li
              key={`${item}-${i}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-forge-line bg-forge-panel2 py-1 pl-3 pr-1.5 text-xs text-slate-200"
            >
              <span className="truncate">{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                aria-label={removeLabel(item)}
                title="Remove"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-forge-dim hover:bg-red-500/20 hover:text-red-300"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length === 0 && <p className="text-sm text-forge-dim">None yet — add one below.</p>}
      <div className="mt-2 flex gap-2">
        <input
          className="field min-w-0 flex-1 !py-1.5"
          value={draft}
          maxLength={130}
          disabled={items.length >= max}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={items.length >= max ? `Limit reached (${max})` : addPlaceholder}
          aria-label={addPlaceholder}
        />
        <Button className="!py-1.5 !text-xs" disabled={!draft.trim() || items.length >= max} onClick={commit}>
          <PlusIcon className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}

export function BibleTabs({
  doc,
  onEdit,
  onEditDoc,
  onSelectLocation,
  imageUrls,
}: {
  doc: WorldDoc;
  onEdit: Mutate;
  onEditDoc?: MutateDoc;
  onSelectLocation: (id: string) => void;
  imageUrls?: Record<string, string>;
}) {
  const [tab, setTab] = React.useState<TabId>("locations");
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const world = doc.world;

  const onCopy = (key: string, text: string) => {
    void copyText(text).then((ok) => {
      if (ok) {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1600);
      }
    });
  };

  return (
    <section aria-label="World bible" className="mt-6 rounded-xl border border-forge-line bg-forge-panel">
      <div className="flex gap-1 overflow-x-auto border-b border-forge-line p-2" role="tablist" aria-label="World bible tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-cyan-400/10 text-cyan-300" : "text-forge-dim hover:bg-forge-panel2 hover:text-slate-200"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="nice-scroll max-h-[520px] overflow-y-auto p-4 sm:p-5" role="tabpanel">
        {tab === "locations" && (
          <div className="space-y-4">
            {world.locations.map((loc, i) => {
              const thumb = imageUrls?.[loc.id];
              return (
              <article key={loc.id} className="rounded-lg border border-forge-line bg-forge-bg/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex min-w-0 items-center gap-2.5 font-bold">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" aria-hidden className="h-10 w-10 shrink-0 rounded-lg object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-sm font-extrabold text-cyan-300">
                        {i + 1}
                      </span>
                    )}
                    <span className="truncate">{loc.name}</span>
                  </h3>
                  <Button className="!px-2.5 !py-1 !text-xs" onClick={() => onSelectLocation(loc.id)}>
                    <EyeIcon className="h-3.5 w-3.5" /> Map
                  </Button>
                </div>
                <div className="mt-3">
                  <Label>Name</Label>
                  <input className="field" value={loc.name} maxLength={80} onChange={(e) => onEdit((w) => {
                    w.locations.find((l) => l.id === loc.id)!.name = e.target.value;
                  })} />
                </div>
                <div className="mt-3">
                  <Label>Kind — tap one, or write your own below</Label>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Kind for ${loc.name}`}>
                    {KIND_OPTIONS.map((k) => (
                      <PickChip
                        key={k}
                        selected={loc.category === k}
                        onClick={() => onEdit((w) => {
                          w.locations.find((l) => l.id === loc.id)!.category = k;
                        })}
                      >
                        {k}
                      </PickChip>
                    ))}
                  </div>
                  <input
                    className="field mt-2"
                    value={loc.category}
                    maxLength={60}
                    placeholder="Custom kind…"
                    aria-label={`Custom kind for ${loc.name}`}
                    onChange={(e) => onEdit((w) => {
                      w.locations.find((l) => l.id === loc.id)!.category = e.target.value;
                    })}
                  />
                </div>
                <div className="mt-3">
                  <Label>Story</Label>
                  <textarea className="field resize-y" rows={2} value={loc.description} maxLength={1200} onChange={(e) => onEdit((w) => {
                    w.locations.find((l) => l.id === loc.id)!.description = e.target.value;
                  })} />
                </div>
                <details className="mt-2">
                  <summary className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-forge-dim">
                    <ChevronDownIcon className="h-3.5 w-3.5" /> Props & art prompt
                  </summary>
                  <div className="mt-2">
                    <Label>Key props — tap × to drop one</Label>
                    <ChipListEditor
                      items={loc.keyProps}
                      max={10}
                      addPlaceholder="Add a prop…"
                      removeLabel={(item) => `Remove prop ${item}`}
                      onChange={(items) => onEdit((w) => {
                        w.locations.find((l) => l.id === loc.id)!.keyProps = items;
                      })}
                    />
                  </div>
                  <div className="mt-2">
                    <Label>Art prompt</Label>
                    <textarea className="field resize-y" rows={2} value={loc.imagePrompt} maxLength={1500} onChange={(e) => onEdit((w) => {
                      w.locations.find((l) => l.id === loc.id)!.imagePrompt = e.target.value;
                    })} />
                  </div>
                </details>
              </article>
              );
            })}
          </div>
        )}

        {tab === "npcs" && (
          <div className="space-y-4">
            {world.npcs.map((npc) => (
              <article key={npc.id} className="rounded-lg border border-forge-line bg-forge-bg/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forge-purple/15 font-extrabold text-forge-purple">
                    {npc.name.charAt(0) || "?"}
                  </span>
                  <input
                    className="min-w-0 flex-1 basis-32 bg-transparent font-bold outline-none focus:border-b focus:border-cyan-400"
                    value={npc.name}
                    maxLength={80}
                    aria-label="NPC name"
                    onChange={(e) => onEdit((w) => {
                      w.npcs.find((n) => n.id === npc.id)!.name = e.target.value;
                    })}
                  />
                </div>
                <div className="mt-2">
                  <Label>Home — tap a place</Label>
                  <PlaceChips
                    locations={world.locations}
                    value={npc.locationId}
                    label={`Home place for ${npc.name}`}
                    onPick={(id) => onEdit((w) => {
                      w.npcs.find((n) => n.id === npc.id)!.locationId = id;
                    })}
                  />
                </div>
                <div className="mt-2 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                  <div>
                    <Label>Role</Label>
                    <input className="field" value={npc.role} maxLength={120} onChange={(e) => onEdit((w) => {
                      w.npcs.find((n) => n.id === npc.id)!.role = e.target.value;
                    })} />
                  </div>
                  <div>
                    <Label>Vibe</Label>
                    <input className="field" value={npc.personality} maxLength={600} onChange={(e) => onEdit((w) => {
                      w.npcs.find((n) => n.id === npc.id)!.personality = e.target.value;
                    })} />
                  </div>
                </div>
                <div className="relative mt-3 rounded-xl rounded-tl-sm bg-forge-panel2 p-3">
                  <MessageIcon className="absolute -left-0 -top-2.5 h-5 w-5 rounded-full bg-forge-panel p-0.5 text-forge-purple" />
                  <div className="absolute right-2 top-2">
                    <SpeakButton text={npc.dialogue} label={`Read ${npc.name}'s line aloud`} />
                  </div>
                  <textarea
                    className="w-full bg-transparent text-sm italic outline-none placeholder:text-slate-600"
                    rows={2}
                    value={npc.dialogue}
                    maxLength={800}
                    aria-label={`Dialogue for ${npc.name}`}
                    onChange={(e) => onEdit((w) => {
                      w.npcs.find((n) => n.id === npc.id)!.dialogue = e.target.value;
                    })}
                  />
                </div>
              </article>
            ))}
          </div>
        )}

        {tab === "quests" && (
          <div className="space-y-4">
            <article className="rounded-lg border border-cyan-400/30 bg-forge-bg/60 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded bg-cyan-400/15 px-1.5 py-0.5 font-mono text-xs font-bold text-cyan-300">MAIN</span>
                <input
                  className="min-w-0 flex-1 bg-transparent font-bold outline-none focus:border-b focus:border-cyan-400"
                  value={world.mainQuest.title}
                  maxLength={120}
                  aria-label="Main quest title"
                  onChange={(e) => onEdit((w) => {
                    w.mainQuest.title = e.target.value;
                  })}
                />
              </div>
              <input
                className="field mt-2"
                value={world.mainQuest.goal}
                maxLength={600}
                aria-label="Main quest goal"
                onChange={(e) => onEdit((w) => {
                  w.mainQuest.goal = e.target.value;
                })}
              />
              {/* visual step timeline, each step editable */}
              <ol className="mt-4">
                {world.mainQuest.steps.map((s, i) => (
                  <li key={i} className="relative flex gap-3 pb-2 last:pb-0">
                    {i < world.mainQuest.steps.length - 1 && (
                      <span aria-hidden className="absolute left-[13px] top-8 h-[calc(100%-1.75rem)] w-0.5 rounded bg-cyan-400/25" />
                    )}
                    <span className="tabular z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-400/50 bg-forge-panel text-xs font-bold text-cyan-300">
                      {i + 1}
                    </span>
                    <input
                      className="field !py-1.5"
                      value={s}
                      maxLength={300}
                      aria-label={`Step ${i + 1}`}
                      onChange={(e) => onEdit((w) => {
                        w.mainQuest.steps[i] = e.target.value;
                      })}
                    />
                    <button
                      className="shrink-0 rounded-md px-1.5 text-forge-dim hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30"
                      disabled={world.mainQuest.steps.length <= 2}
                      onClick={() => onEdit((w) => {
                        if (w.mainQuest.steps.length > 2) w.mainQuest.steps.splice(i, 1);
                      })}
                      aria-label={`Remove step ${i + 1}`}
                      title="Remove step"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ol>
              <Button
                className="mt-2 !text-xs"
                disabled={world.mainQuest.steps.length >= 12}
                onClick={() => onEdit((w) => {
                  if (w.mainQuest.steps.length < 12) w.mainQuest.steps.push("New step");
                })}
              >
                <PlusIcon className="h-3.5 w-3.5" /> Step
              </Button>
            </article>

            {world.sideQuests.map((q) => (
              <article key={q.id} className="rounded-lg border border-forge-line bg-forge-bg/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-forge-purple/15 px-1.5 py-0.5 font-mono text-xs font-bold text-forge-purple">SIDE</span>
                  <input
                    className="min-w-0 flex-1 basis-32 bg-transparent font-bold outline-none focus:border-b focus:border-cyan-400"
                    value={q.title}
                    maxLength={120}
                    aria-label="Side quest title"
                    onChange={(e) => onEdit((w) => {
                      w.sideQuests.find((s) => s.id === q.id)!.title = e.target.value;
                    })}
                  />
                </div>
                <div className="mt-2">
                  <Label>Set at — tap a place</Label>
                  <PlaceChips
                    locations={world.locations}
                    value={q.locationId}
                    label={`Place for side quest ${q.title}`}
                    onPick={(id) => onEdit((w) => {
                      w.sideQuests.find((s) => s.id === q.id)!.locationId = id;
                    })}
                  />
                </div>
                <input
                  className="field mt-2"
                  value={q.goal}
                  maxLength={600}
                  aria-label="Side quest goal"
                  onChange={(e) => onEdit((w) => {
                    w.sideQuests.find((s) => s.id === q.id)!.goal = e.target.value;
                  })}
                />
              </article>
            ))}
          </div>
        )}

        {tab === "assets" && (
          <div className="space-y-4">
            {world.assets.categories.map((cat, ci) => (
              <article key={`${cat.name}-${ci}`} className="rounded-lg border border-forge-line bg-forge-bg/60 p-4">
                <div className="flex items-center gap-2">
                  <CheckSquareIcon className="h-4 w-4 shrink-0 text-cyan-300" />
                  <input
                    className="min-w-0 flex-1 bg-transparent font-bold outline-none focus:border-b focus:border-cyan-400"
                    value={cat.name}
                    maxLength={80}
                    aria-label="Category name"
                    onChange={(e) => onEdit((w) => {
                      w.assets.categories[ci].name = e.target.value;
                    })}
                  />
                  <CountBadge n={cat.items.length} label="items" />
                  <button
                    className="rounded-md p-1.5 text-forge-dim hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30"
                    disabled={world.assets.categories.length <= 1}
                    onClick={() => onEdit((w) => {
                      if (w.assets.categories.length > 1) w.assets.categories.splice(ci, 1);
                    })}
                    aria-label={`Remove ${cat.name}`}
                    title="Remove category"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2">
                  <ChipListEditor
                    items={cat.items}
                    max={24}
                    addPlaceholder="Add an item…"
                    removeLabel={(item) => `Remove ${item} from ${cat.name}`}
                    onChange={(items) => onEdit((w) => {
                      w.assets.categories[ci].items = items;
                    })}
                  />
                </div>
              </article>
            ))}
            <Button
              disabled={world.assets.categories.length >= 10}
              onClick={() => onEdit((w) => {
                if (w.assets.categories.length < 10) w.assets.categories.push({ name: "New category", items: ["New item"] });
              })}
            >
              <PlusIcon /> Category
            </Button>
          </div>
        )}

        {tab === "prompts" && (
          <div className="space-y-4">
            <article className="rounded-lg border border-forge-line bg-forge-bg/60 p-4">
              <h3 className="flex items-center gap-2 font-bold">
                <BoxIcon className="h-4 w-4 text-cyan-300" /> Blender
              </h3>
              <textarea
                className="field mt-2 resize-y font-mono !text-[13px]"
                rows={7}
                value={world.blenderPrompt}
                maxLength={2500}
                aria-label="Blender production prompt"
                onChange={(e) => onEdit((w) => {
                  w.blenderPrompt = e.target.value;
                })}
              />
            </article>
            <article className="rounded-lg border border-forge-line bg-forge-bg/60 p-4">
              <h3 className="flex items-center gap-2 font-bold">
                <BoxIcon className="h-4 w-4 text-forge-purple" /> Unreal
                <span className="text-[11px] font-normal text-forge-dim">planning reference — not playable levels</span>
              </h3>
              <textarea
                className="field mt-2 resize-y font-mono !text-[13px]"
                rows={7}
                value={world.unrealPrompt}
                maxLength={2500}
                aria-label="Unreal production prompt"
                onChange={(e) => onEdit((w) => {
                  w.unrealPrompt = e.target.value;
                })}
              />
            </article>
          </div>
        )}

        {tab === "platforms" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Target platforms">
              <span className="text-xs font-bold uppercase tracking-wide text-forge-dim">Targets:</span>
              {ALL_PLATFORMS.map((p) => {
                const on = doc.platforms.includes(p);
                return (
                  <button
                    key={p}
                    aria-pressed={on}
                    onClick={() =>
                      onEditDoc?.((d) => {
                        if (d.platforms.includes(p)) {
                          if (d.platforms.length > 1) d.platforms = d.platforms.filter((x) => x !== p);
                        } else if (d.platforms.length < 3) {
                          d.platforms = [...d.platforms, p];
                        }
                      })
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                      on ? "border-cyan-400/60 bg-cyan-400/10 text-slate-100" : "border-forge-line text-forge-dim"
                    }`}
                  >
                    <span style={{ color: PLATFORM_META[p].color }}>{PLATFORM_ICONS[p]}</span>
                    {PLATFORM_META[p].short}
                  </button>
                );
              })}
            </div>

            {doc.platforms.map((p) => {
              const pack = buildPlatformPack(doc, p);
              const meta = PLATFORM_META[p];
              return (
                <article key={p} className="rounded-lg border border-forge-line bg-forge-bg/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ background: `${meta.color}1f`, color: meta.color }}
                    >
                      {PLATFORM_ICONS[p]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold leading-tight">{meta.name}</h3>
                      <p className="text-xs text-forge-dim">{meta.tagline}</p>
                    </div>
                    <span className="tabular rounded-full bg-forge-panel2 px-2 py-0.5 text-[11px] font-bold text-forge-dim">
                      {pack.scriptLanguage}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-slate-200">{pack.prompt}</p>
                  <div className="mt-2">
                    <Button
                      className="!px-2.5 !py-1 !text-xs"
                      onClick={() => onCopy(`${p}-prompt`, pack.prompt)}
                    >
                      {copiedKey === `${p}-prompt` ? (
                        <>
                          <CheckIcon className="h-3.5 w-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <CopyIcon className="h-3.5 w-3.5" /> Copy plan
                        </>
                      )}
                    </Button>
                  </div>

                  <details className="mt-3">
                    <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-bold">
                      <ChevronDownIcon className="h-4 w-4 text-cyan-300" />
                      Build checklist
                      <CountBadge n={pack.checklist.length} label="steps" />
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {pack.checklist.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-forge-dim">
                          <span aria-hidden className="mt-1 h-3.5 w-3.5 shrink-0 rounded border border-forge-line" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </details>

                  <details className="mt-2" open>
                    <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-bold">
                      <ChevronDownIcon className="h-4 w-4 text-forge-purple" />
                      {pack.scriptTitle}
                    </summary>
                    <pre className="nice-scroll mt-2 overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-xs leading-relaxed text-slate-200">
                      {pack.script}
                    </pre>
                    <div className="mt-2">
                      <Button
                        className="!px-2.5 !py-1 !text-xs"
                        onClick={() => onCopy(`${p}-script`, pack.script)}
                      >
                        {copiedKey === `${p}-script` ? (
                          <>
                            <CheckIcon className="h-3.5 w-3.5" /> Copied
                          </>
                        ) : (
                          <>
                            <CopyIcon className="h-3.5 w-3.5" /> Copy script
                          </>
                        )}
                      </Button>
                    </div>
                  </details>
                </article>
              );
            })}
            <p className="text-xs text-forge-dim">
              Scaffolds to adapt inside each platform editor — not playable level exports.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
