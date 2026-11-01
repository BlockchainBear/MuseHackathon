"use client";

import React from "react";
import type { MapPos, World, WorldDoc, WorldLocation } from "@/lib/schema";
import { WorldMap } from "./WorldMap";
import { BibleTabs } from "./BibleTabs";
import { Button, Label, SourceBadge, Spinner, UsageWarning } from "./ui";

export type SaveStatus = "clean" | "dirty" | "saving" | "error";

export interface WorkspaceActions {
  onSelect: (id: string) => void;
  onMove: (id: string, pos: MapPos) => void;
  onEditWorld: (fn: (w: World) => void) => void;
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
  onBack: () => void;
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
      <span className="text-sm text-red-300" role="alert">
        Save failed{error ? `: ${error}` : ""}
      </span>
    );
  if (status === "dirty") return <span className="text-sm text-amber-300">Unsaved changes…</span>;
  return <span className="text-sm text-emerald-300">All changes saved</span>;
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
  const pending = meta.status === "pending" || false;
  return (
    <div className="overflow-hidden rounded-lg border border-forge-line bg-forge-bg/60">
      <div className="border-b border-forge-line px-3 py-2">
        <p className="text-xs font-bold uppercase tracking-wide text-forge-dim">Concept art</p>
      </div>
      <div className="p-3">
        {meta.status === "ready" || meta.status === "outdated" ? (
          imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={`Concept art for ${loc.name}`} className="w-full rounded-md" />
          ) : (
            <p className="text-sm text-forge-dim">Saved art is missing from this browser — regenerate to restore it.</p>
          )
        ) : meta.status === "pending" ? (
          <div className="flex items-center justify-center py-8">
            <Spinner label="Generating concept art…" />
          </div>
        ) : meta.status === "failed" ? (
          <p className="text-sm text-red-300" role="alert">
            Generation failed{meta.error ? `: ${meta.error}` : ""}. The world is untouched — retry when ready.
          </p>
        ) : (
          <p className="text-sm text-forge-dim">No concept art yet. Images generate only when you ask.</p>
        )}
        {meta.status === "outdated" && (
          <p className="mt-2 rounded bg-amber-400/10 px-2 py-1 text-xs text-amber-300" role="note">
            Outdated — the location text changed. Regenerate to match.
          </p>
        )}
        <p className="mt-2 text-[11px] text-forge-dim">2D illustration reference, not a 3D asset.</p>
        <div className="mt-2">
          <Button
            className="!text-xs"
            disabled={pending || batchRunning}
            onClick={() => onGenerateImage(loc.id)}
          >
            {meta.status === "ready" || meta.status === "outdated" ? "Regenerate image" : meta.status === "failed" ? "Retry image" : "Generate image"}
          </Button>
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
  const [connectTo, setConnectTo] = React.useState("");

  React.useEffect(() => {
    setRemixText("");
    setConnectTo("");
  }, [selectedId]);

  const readyCount = world.locations.filter((l) => {
    const s = doc.imageState[l.id]?.status;
    return s === "ready" || s === "outdated";
  }).length;

  return (
    <div className="no-print mx-auto w-full max-w-7xl px-4 py-6">
      {/* header */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
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
              className="mt-1 w-full bg-transparent text-2xl font-extrabold outline-none placeholder:text-slate-600 focus:border-b focus:border-cyan-400 sm:text-3xl"
            />
            <p className="mt-0.5 text-sm text-forge-dim">
              {world.genre} · {world.tone} · from: “{world.idea.length > 90 ? world.idea.slice(0, 90) + "…" : world.idea}”
            </p>
          </div>
        </div>

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-forge-line bg-forge-panel p-2">
          <Button variant="primary" onClick={actions.onSave} disabled={props.saveStatus !== "dirty"}>
            Save
          </Button>
          <Button onClick={actions.onExportJson} disabled={!!props.exporting}>
            {props.exporting === "json" ? "Exporting…" : "JSON"}
          </Button>
          <Button onClick={actions.onExportSvg} disabled={!!props.exporting}>
            {props.exporting === "svg" ? "Exporting…" : "SVG"}
          </Button>
          <Button onClick={actions.onExportZip} disabled={!!props.exporting}>
            {props.exporting === "zip" ? "Building ZIP…" : "World Kit ZIP"}
          </Button>
          <Button onClick={actions.onPrint}>Print / Save as PDF</Button>
          <Button
            variant="accent"
            onClick={actions.onGenerateAllImages}
            disabled={props.batchRunning}
            title="Generate concept art for all five locations, one at a time"
          >
            {props.batchRunning ? "Generating…" : `Generate All 5 Images (${readyCount}/5 ready)`}
          </Button>
          <Button onClick={actions.onResetLayout}>Reset Layout</Button>
          <Button onClick={actions.onBack}>Saved Worlds</Button>
        </div>
        {props.batchProgress && (
          <p className="text-sm text-cyan-300" role="status">
            {props.batchProgress}
          </p>
        )}
        {props.imageError && (
          <p className="text-sm text-red-300" role="alert">
            {props.imageError}
          </p>
        )}
        <UsageWarning compact />
      </header>

      {/* overview editor */}
      <details className="mt-4 rounded-xl border border-forge-line bg-forge-panel px-4 py-3">
        <summary className="cursor-pointer text-sm font-bold">Edit world overview & style</summary>
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
            <Label>Visual direction (shared by all concept art)</Label>
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
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="rounded-xl border border-forge-line bg-forge-panel p-3 sm:p-4 xl:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-forge-dim">Location map</h2>
            <span className="text-xs text-forge-dim">Drag nodes to rearrange · click to select</span>
          </div>
          <WorldMap doc={doc} selectedId={selectedId} onSelect={actions.onSelect} onMove={actions.onMove} />
        </div>

        <div className="xl:col-span-2">
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
                <div>
                  <Label>Concept-art prompt</Label>
                  <textarea
                    className="field resize-y"
                    rows={2}
                    value={selected.imagePrompt}
                    maxLength={1500}
                    onChange={(e) => actions.onEditWorld((w) => {
                      w.locations.find((l) => l.id === selected.id)!.imagePrompt = e.target.value;
                    })}
                  />
                </div>

                {/* remix */}
                <div className="rounded-lg border border-forge-purple/40 bg-forge-bg/60 p-3">
                  <Label>AI remix this location</Label>
                  <div className="flex gap-2">
                    <input
                      className="field"
                      placeholder="Make this location abandoned and more mysterious…"
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
                      Remix
                    </Button>
                  </div>
                  {props.remixPending && (
                    <div className="mt-2">
                      <Spinner label="Remixing location…" />
                    </div>
                  )}
                  {props.remixError && (
                    <p className="mt-2 text-sm text-red-300" role="alert">
                      {props.remixError}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-forge-dim">
                    Rewrites text only. Map position and links are kept; existing art is marked outdated.
                  </p>
                </div>

                {/* connections */}
                <div>
                  <Label>Connections</Label>
                  {world.connections.filter((c) => c.from === selected.id || c.to === selected.id).length === 0 && (
                    <p className="text-sm text-forge-dim">No connections yet.</p>
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
                            aria-label={`Remove connection to ${otherName}`}
                          >
                            Remove
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-2 flex gap-2">
                    <select className="field" value={connectTo} onChange={(e) => setConnectTo(e.target.value)} aria-label="Connect to location">
                      <option value="">Connect to…</option>
                      {world.locations
                        .filter((l) => l.id !== selected.id)
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                    </select>
                    <Button
                      disabled={!connectTo}
                      onClick={() => {
                        if (connectTo) {
                          actions.onAddConnection(selected.id, connectTo);
                          setConnectTo("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* linked NPCs & quests */}
                <div className="text-sm">
                  <Label>Linked content</Label>
                  <ul className="mt-1 space-y-1 text-forge-dim">
                    {world.npcs
                      .filter((n) => n.locationId === selected.id)
                      .map((n) => (
                        <li key={n.id}>
                          <span className="text-cyan-300">NPC:</span> {n.name} — “{n.dialogue.length > 80 ? n.dialogue.slice(0, 80) + "…" : n.dialogue}”
                        </li>
                      ))}
                    {world.sideQuests
                      .filter((q) => q.locationId === selected.id)
                      .map((q) => (
                        <li key={q.id}>
                          <span className="text-forge-purple">Side quest:</span> {q.title}
                        </li>
                      ))}
                    {world.mainQuest.locationIds.includes(selected.id) && (
                      <li>
                        <span className="text-cyan-300">Main quest:</span> {world.mainQuest.title}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-forge-line bg-forge-panel p-6 text-center text-forge-dim">
              Select a location on the map to inspect and edit it.
            </div>
          )}
        </div>
      </div>

      <BibleTabs doc={doc} onEdit={actions.onEditWorld} onSelectLocation={actions.onSelect} />
    </div>
  );
}
