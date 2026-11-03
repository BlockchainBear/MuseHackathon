"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { MapPos, World, WorldDoc, WorldLocation } from "@/lib/schema";
import { PLATFORM_META } from "@/lib/platforms";
import { WorldMap } from "./WorldMap";
import { BibleTabs } from "./BibleTabs";
import { PLATFORM_ICONS } from "./CreateView";
import { Button, Label, PickChip, SourceBadge, Spinner, UsageWarning } from "./ui";
import { MicButton } from "./SpeechControls";
import {
  AlertIcon,
  ArchiveIcon,
  CheckIcon,
  ClockIcon,
  CompassIcon,
  EyeIcon,
  FileIcon,
  ImageIcon,
  LayoutGridIcon,
  LinkIcon,
  MapPinIcon,
  PrinterIcon,
  RefreshIcon,
  SaveIcon,
  UsersIcon,
} from "./icons";

const Constellation = dynamic(() => import("./Constellation").then((m) => m.Constellation), { ssr: false });

export type SaveStatus = "clean" | "dirty" | "saving" | "error";

/** One-tap remix flavors: each chip fires a remix immediately, no typing needed. */
const REMIX_PRESETS: { label: string; instruction: string }[] = [
  { label: "Abandoned", instruction: "Reimagine it as long-abandoned, with nature reclaiming the space" },
  { label: "Darker", instruction: "Make it darker and more ominous" },
  { label: "Cozy", instruction: "Make it cozy and welcoming" },
  { label: "Neon-lit", instruction: "Bathe it in neon light, night-market energy" },
  { label: "Ancient", instruction: "Make it feel ancient, layered with forgotten history" },
  { label: "Haunted", instruction: "Make it haunted and eerie" },
  { label: "Overgrown", instruction: "Cover it in lush overgrowth, jungle reclaiming stone" },
  { label: "Festive", instruction: "Make it festive, caught mid-celebration" },
];

export interface WorkspaceActions {
  onSelect: (id: string) => void;
  onMove: (id: string, pos: MapPos) => void;
  onEditWorld: (fn: (w: World) => void) => void;
  onEditDoc: (fn: (d: WorldDoc) => void) => void;
  onRemix: (locationId: string, instruction: string) => void;
  onGenerateImage: (locationId: string) => void;
  onGenerateAllImages: () => void;
  onResetLayout: () => void;
  onAddConnection: (from: string, to: string) => void;
  onRemoveConnection: (index: number) => void;
  onSave: () => void;
  onExportJson: () => void;
  onExportSvg: () => void;
  onExportZip: () => void;
  onPrint: () => void;
}

interface WorkspaceProps {
  doc: WorldDoc;
  selectedId: string | null;
  saveStatus: SaveStatus;
  saveError: string | null;
  imageUrls: Record<string, string>;
  remixPending: boolean;
  remixError: string | null;
  batchRunning: boolean;
  batchProgress: string | null;
  imageError: string | null;
  exporting: string | null;
  actions: WorkspaceActions;
}

function SaveIndicator({ status, error }: { status: SaveStatus; error: string | null }) {
  if (status === "saving") return <Spinner label="Saving…" />;
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-red-300" role="alert">
        <AlertIcon /> Save failed{error ? `: ${error}` : ""}
      </span>
    );
  if (status === "dirty")
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-amber-300">
        <ClockIcon /> Unsaved changes…
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
      <CheckIcon /> Saved
    </span>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-forge-line bg-forge-panel px-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="tabular block text-lg font-extrabold leading-none">{value}</span>
        <span className="block truncate text-[11px] uppercase tracking-wider text-forge-dim">{label}</span>
      </span>
    </div>
  );
}

function ImageBlock({
  doc,
  loc,
  imageUrl,
  batchRunning,
  onGenerateImage,
}: {
  doc: WorldDoc;
  loc: WorldLocation;
  imageUrl: string | undefined;
  batchRunning: boolean;
  onGenerateImage: (id: string) => void;
}) {
  const meta = doc.imageState[loc.id] ?? { status: "none" as const };
  const pending = meta.status === "pending";
  return (
    <div className="overflow-hidden rounded-lg border border-forge-line bg-forge-bg/60">
      <div className="flex items-center justify-between border-b border-forge-line px-3 py-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-forge-dim">
          <ImageIcon className="h-3.5 w-3.5" /> Concept art
        </p>
        {meta.status === "ready" && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
            <CheckIcon className="h-3 w-3" /> {meta.bundled ? "SAMPLE ART" : "READY"}
          </span>
        )}
        {meta.status === "outdated" && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300">
            <ClockIcon className="h-3 w-3" /> OUTDATED
          </span>
        )}
        {meta.status === "failed" && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-300">
            <AlertIcon className="h-3 w-3" /> FAILED
          </span>
        )}
      </div>
      <div className="p-3">
        {meta.status === "ready" || meta.status === "outdated" ? (
          imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={`Concept art for ${loc.name}`} className="w-full rounded-md" />
          ) : (
            <p className="text-sm text-forge-dim">Saved art is missing here — regenerate to restore it.</p>
          )
        ) : meta.status === "pending" ? (
          <div className="flex items-center justify-center py-8">
            <Spinner label="Painting…" />
          </div>
        ) : meta.status === "failed" ? (
          <p className="text-sm text-red-300" role="alert">
            {meta.error ? `${meta.error}` : "Generation failed."} World untouched — retry when ready.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forge-panel2 text-forge-dim">
              <ImageIcon className="h-5 w-5" />
            </span>
            <p className="text-sm text-forge-dim">No art yet — generate on demand.</p>
          </div>
        )}
        {meta.status === "outdated" && (
          <p className="mt-2 rounded bg-amber-400/10 px-2 py-1 text-xs text-amber-300" role="note">
            Text changed since this was painted.
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <Button className="!text-xs" disabled={pending || batchRunning} onClick={() => onGenerateImage(loc.id)}>
            <ImageIcon className="h-3.5 w-3.5" />
            {meta.status === "ready" || meta.status === "outdated" ? "Regenerate" : meta.status === "failed" ? "Retry" : "Generate"}
          </Button>
          <span className="text-[11px] text-forge-dim">2D reference, not a 3D asset</span>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceView(props: WorkspaceProps) {
  const { doc, selectedId, actions } = props;
  const world = doc.world;
  const selected = world.locations.find((l) => l.id === selectedId) ?? null;
  const [remixText, setRemixText] = React.useState("");
  const [linking, setLinking] = React.useState(false);

  React.useEffect(() => {
    setRemixText("");
    setLinking(false);
  }, [selectedId]);

  const readyCount = world.locations.filter((l) => {
    const s = doc.imageState[l.id]?.status;
    return s === "ready" || s === "outdated";
  }).length;

  return (
    <div className="no-print mx-auto w-full max-w-7xl px-4 py-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={doc.source} />
          <SaveIndicator status={props.saveStatus} error={props.saveError} />
        </div>
        <input
          value={world.name}
          maxLength={100}
          onChange={(e) => actions.onEditWorld((w) => {
            w.name = e.target.value;
          })}
          aria-label="World name"
          className="w-full bg-transparent text-2xl font-extrabold outline-none placeholder:text-slate-600 focus:border-b focus:border-cyan-400 sm:text-3xl"
        />

        {/* stat strip */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="World at a glance">
          <Stat icon={<MapPinIcon />} value="5" label="Locations" />
          <Stat icon={<UsersIcon />} value="3" label="NPCs" />
          <Stat icon={<CompassIcon />} value="4" label="Quests" />
          <Stat icon={<ImageIcon />} value={`${readyCount}/5`} label="Art ready" />
        </div>

        {/* build targets */}
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Build targets">
          <span className="text-xs font-bold uppercase tracking-wide text-forge-dim">Ship to:</span>
          {doc.platforms.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1.5 rounded-full border border-forge-line bg-forge-panel px-2.5 py-1 text-xs font-bold"
              style={{ color: PLATFORM_META[p].color }}
            >
              {PLATFORM_ICONS[p]}
              <span className="text-slate-100">{PLATFORM_META[p].name}</span>
            </span>
          ))}
        </div>

        {/* toolbar: sideways scroll on phones, wraps on larger screens */}
        <div className="nice-scroll flex items-center gap-2 overflow-x-auto rounded-xl border border-forge-line bg-forge-panel p-2 sm:flex-wrap sm:overflow-visible">
          <Button variant="primary" onClick={actions.onSave} disabled={props.saveStatus !== "dirty"}>
            <SaveIcon /> Save
          </Button>
          <Button onClick={actions.onExportJson} disabled={!!props.exporting} title="Download world JSON">
            <FileIcon /> {props.exporting === "json" ? "…" : "JSON"}
          </Button>
          <Button onClick={actions.onExportSvg} disabled={!!props.exporting} title="Download map SVG">
            <EyeIcon /> {props.exporting === "svg" ? "…" : "SVG"}
          </Button>
          <Button onClick={actions.onExportZip} disabled={!!props.exporting} title="Download full world kit ZIP">
            <ArchiveIcon /> {props.exporting === "zip" ? "Zipping…" : "Kit ZIP"}
          </Button>
          <Button onClick={actions.onPrint} title="Open print layout for Save as PDF">
            <PrinterIcon /> Print
          </Button>
          <Button
            variant="accent"
            onClick={actions.onGenerateAllImages}
            disabled={props.batchRunning}
            title="Paint all five locations, one at a time"
          >
            <ImageIcon /> {props.batchRunning ? "Painting…" : `All 5 Art (${readyCount}/5)`}
          </Button>
          <Button onClick={actions.onResetLayout} title="Restore default map positions">
            <LayoutGridIcon /> Layout
          </Button>
        </div>
        {props.batchProgress && (
          <p className="text-sm text-cyan-300" role="status">
            {props.batchProgress}
          </p>
        )}
        {props.imageError && (
          <p className="inline-flex items-start gap-1.5 text-sm text-red-300" role="alert">
            <AlertIcon className="mt-0.5" /> {props.imageError}
          </p>
        )}
        <UsageWarning compact />
      </header>

      {/* 3D constellation */}
      <div className="mt-4 overflow-hidden rounded-xl border border-forge-line bg-forge-panel">
        <div className="flex items-center justify-between px-4 pt-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-forge-dim">3D Constellation</h2>
          <span className="text-xs text-forge-dim">Drag to orbit · scroll to zoom · click a crystal</span>
        </div>
        <Constellation doc={doc} selectedId={selectedId} onSelect={actions.onSelect} className="h-64 w-full sm:h-80 lg:h-96" />
      </div>

      {/* overview editor */}
      <details className="mt-4 rounded-xl border border-forge-line bg-forge-panel px-4 py-3">
        <summary className="cursor-pointer text-sm font-bold">World story & style</summary>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <Label>Logline</Label>
            <textarea
              className="field resize-y"
              rows={2}
              value={world.logline}
              maxLength={400}
              onChange={(e) => actions.onEditWorld((w) => {
                w.logline = e.target.value;
              })}
            />
          </div>
          <div>
            <Label>Visual style (shared by all art)</Label>
            <textarea
              className="field resize-y"
              rows={2}
              value={world.visualDirection}
              maxLength={2000}
              onChange={(e) => actions.onEditWorld((w) => {
                w.visualDirection = e.target.value;
              })}
            />
          </div>
        </div>
        <div className="mt-3">
          <Label>Setting overview</Label>
          <textarea
            className="field resize-y"
            rows={4}
            value={world.overview}
            maxLength={3000}
            onChange={(e) => actions.onEditWorld((w) => {
              w.overview = e.target.value;
            })}
          />
        </div>
      </details>

      {/* map + detail */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-forge-line bg-forge-panel p-3 sm:p-4 lg:col-span-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-forge-dim">Location map</h2>
            <span className="text-right text-xs text-forge-dim">
              {linking ? "Tap a glowing place to link it" : "Drag nodes · tap to select"}
            </span>
          </div>
          <WorldMap
            doc={doc}
            selectedId={selectedId}
            onSelect={actions.onSelect}
            onMove={actions.onMove}
            linkFromId={linking ? selectedId : null}
            onConnect={actions.onAddConnection}
            imageUrls={props.imageUrls}
          />
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="rounded-xl border border-forge-line bg-forge-panel p-4" aria-live="polite">
              <p className="font-mono text-xs text-forge-purple">{selected.id}</p>
              <input
                value={selected.name}
                maxLength={80}
                onChange={(e) => actions.onEditWorld((w) => {
                  w.locations.find((l) => l.id === selected.id)!.name = e.target.value;
                })}
                aria-label="Location name"
                className="mt-0.5 w-full bg-transparent text-xl font-extrabold outline-none focus:border-b focus:border-cyan-400"
              />
              <div className="mt-3 space-y-3">
                <ImageBlock
                  doc={doc}
                  loc={selected}
                  imageUrl={props.imageUrls[selected.id]}
                  batchRunning={props.batchRunning}
                  onGenerateImage={actions.onGenerateImage}
                />
                <div>
                  <Label>Description</Label>
                  <textarea
                    className="field resize-y"
                    rows={3}
                    value={selected.description}
                    maxLength={1200}
                    onChange={(e) => actions.onEditWorld((w) => {
                      w.locations.find((l) => l.id === selected.id)!.description = e.target.value;
                    })}
                  />
                </div>

                {/* remix */}
                <div className="rounded-lg border border-forge-purple/40 bg-forge-bg/60 p-3">
                  <Label>Remix with AI — tap a flavor, or write your own</Label>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="One-tap remix flavors">
                    {REMIX_PRESETS.map((p) => (
                      <PickChip
                        key={p.label}
                        disabled={props.remixPending}
                        onClick={() => actions.onRemix(selected.id, p.instruction)}
                        title={p.instruction}
                      >
                        <RefreshIcon className="h-3 w-3" />
                        {p.label}
                      </PickChip>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <MicButton
                      onTranscript={(t) => setRemixText((v) => (v ? `${v} ${t}` : t))}
                      disabled={props.remixPending}
                    />
                    <input
                      className="field min-w-0 flex-1 basis-40"
                      placeholder="Or say/type something custom…"
                      value={remixText}
                      maxLength={1000}
                      disabled={props.remixPending}
                      onChange={(e) => setRemixText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && remixText.trim().length >= 4 && !props.remixPending) {
                          actions.onRemix(selected.id, remixText.trim());
                        }
                      }}
                    />
                    <Button
                      variant="accent"
                      disabled={props.remixPending || remixText.trim().length < 4}
                      onClick={() => actions.onRemix(selected.id, remixText.trim())}
                    >
                      <RefreshIcon /> Remix
                    </Button>
                  </div>
                  {props.remixPending && (
                    <div className="mt-2">
                      <Spinner label="Remixing…" />
                    </div>
                  )}
                  {props.remixError && (
                    <p className="mt-2 text-sm text-red-300" role="alert">
                      {props.remixError}
                    </p>
                  )}
                </div>

                {/* connections */}
                <div>
                  <Label>
                    <span className="inline-flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5" /> Paths
                    </span>
                  </Label>
                  {world.connections.filter((c) => c.from === selected.id || c.to === selected.id).length === 0 && (
                    <p className="text-sm text-forge-dim">No paths yet.</p>
                  )}
                  <ul className="space-y-1">
                    {world.connections.map((c, i) => {
                      if (c.from !== selected.id && c.to !== selected.id) return null;
                      const other = c.from === selected.id ? c.to : c.from;
                      const otherName = world.locations.find((l) => l.id === other)?.name ?? other;
                      return (
                        <li key={i} className="flex items-center justify-between rounded-md bg-forge-bg/60 px-2 py-1 text-sm">
                          <span>↔ {otherName}</span>
                          <button
                            onClick={() => actions.onRemoveConnection(i)}
                            className="rounded px-2 py-0.5 text-xs text-red-300 hover:bg-red-500/10"
                            aria-label={`Remove path to ${otherName}`}
                          >
                            Remove
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Link a new path">
                    {world.locations
                      .filter((l) => l.id !== selected.id)
                      .map((l) => (
                        <PickChip key={l.id} onClick={() => actions.onAddConnection(selected.id, l.id)} title={`Link to ${l.name}`}>
                          <LinkIcon className="h-3 w-3" />
                          {l.name}
                        </PickChip>
                      ))}
                    <PickChip
                      selected={linking}
                      onClick={() => setLinking((v) => !v)}
                      title="Tap places directly on the map to link them"
                    >
                      <MapPinIcon className="h-3 w-3" />
                      {linking ? "Stop linking" : "Link on map"}
                    </PickChip>
                  </div>
                  {linking && (
                    <p className="mt-2 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1.5 text-xs text-cyan-200" role="status">
                      Tap any glowing place on the map to link it to <strong>{selected.name}</strong>.
                    </p>
                  )}
                </div>

                {/* linked NPCs & quests */}
                <div className="text-sm">
                  <Label>Here</Label>
                  <ul className="mt-1 space-y-1.5 text-forge-dim">
                    {world.npcs
                      .filter((n) => n.locationId === selected.id)
                      .map((n) => (
                        <li key={n.id} className="flex items-start gap-1.5">
                          <UsersIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                          <span>
                            {n.name} — “{n.dialogue.length > 70 ? n.dialogue.slice(0, 70) + "…" : n.dialogue}”
                          </span>
                        </li>
                      ))}
                    {world.sideQuests
                      .filter((q) => q.locationId === selected.id)
                      .map((q) => (
                        <li key={q.id} className="flex items-start gap-1.5">
                          <CompassIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forge-purple" />
                          <span>{q.title}</span>
                        </li>
                      ))}
                    {world.mainQuest.locationIds.includes(selected.id) && (
                      <li className="flex items-start gap-1.5">
                        <CompassIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                        <span>{world.mainQuest.title} (main)</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-forge-line bg-forge-panel p-6 text-center text-forge-dim">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forge-panel2">
                <MapPinIcon className="h-5 w-5" />
              </span>
              Pick a location to inspect it.
            </div>
          )}
        </div>
      </div>

      <BibleTabs
        doc={doc}
        onEdit={actions.onEditWorld}
        onEditDoc={actions.onEditDoc}
        onSelectLocation={actions.onSelect}
        imageUrls={props.imageUrls}
      />
    </div>
  );
}
