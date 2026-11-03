"use client";

import React from "react";
import {
  WorldDocSchema,
  WorldSchema,
  formatZodError,
  positionsFor,
  type MapPos,
  type Platform,
  type World,
  type WorldDoc,
} from "@/lib/schema";
import { buildPlatformsMd } from "@/lib/platforms";
import { SAMPLE_ART, makeSampleDoc } from "@/lib/sample";
import {
  base64ToBlob,
  deleteWorld as dbDeleteWorld,
  deleteWorldImages,
  dropImageUrl,
  dropWorldImageUrls,
  getImage,
  getImageUrl,
  getWorld,
  listWorlds,
  putImage,
  putWorld,
  StorageError,
  type SavedWorldRow,
} from "@/lib/db";
import {
  buildKitReadme,
  buildMapSvg,
  buildWorldBibleMd,
  buildWorldJson,
  downloadBlob,
  downloadText,
  slugify,
} from "@/lib/exporters";
import { AppNav } from "@/components/AppNav";
import { CreateView } from "@/components/CreateView";
import { SavedView } from "@/components/SavedView";
import { WorkspaceView, type SaveStatus } from "@/components/WorkspaceView";
import { PrintSheet } from "@/components/PrintSheet";

type View = "create" | "workspace" | "saved";

interface ApiError {
  error?: string;
  retryable?: boolean;
}

async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as ApiError;
    return typeof body.error === "string" && body.error ? body.error : fallback;
  } catch {
    return fallback;
  }
}

function newWorldId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function docFromWorld(world: World, source: WorldDoc["source"], platforms: Platform[]): WorldDoc {
  return {
    world,
    positions: positionsFor(world.locations.map((l) => l.id)),
    imageState: {},
    source,
    platforms,
  };
}

export default function Home() {
  const [view, setView] = React.useState<View>("create");
  const [doc, setDoc] = React.useState<WorldDoc | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("clean");
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [imageUrls, setImageUrls] = React.useState<Record<string, string>>({});

  const [generating, setGenerating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [liveReady, setLiveReady] = React.useState<boolean | null>(null);

  const [remixPending, setRemixPending] = React.useState(false);
  const [remixError, setRemixError] = React.useState<string | null>(null);
  const [batchRunning, setBatchRunning] = React.useState(false);
  const [batchProgress, setBatchProgress] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState<string | null>(null);

  const [saved, setSaved] = React.useState<SavedWorldRow[]>([]);
  const [savedLoading, setSavedLoading] = React.useState(false);
  const [savedError, setSavedError] = React.useState<string | null>(null);

  const docRef = React.useRef<WorldDoc | null>(null);
  docRef.current = doc;
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusLoaded = React.useRef(false);

  /* ------------------------- status (lazy) ------------------------- */
  const ensureStatus = React.useCallback(async () => {
    if (statusLoaded.current) return;
    statusLoaded.current = true;
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const body = (await res.json()) as { configured?: boolean };
        setLiveReady(body.configured === true);
      }
    } catch {
      /* offline status stays unknown; generation will report clearly */
    }
  }, []);

  /* ------------------------- persistence ------------------------- */
  const persistNow = React.useCallback(async (target?: WorldDoc | null): Promise<boolean> => {
    const d = target ?? docRef.current;
    if (!d) return true;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSaveStatus("saving");
    setSaveError(null);
    try {
      await putWorld(d);
      if (docRef.current?.world.id === d.world.id) setSaveStatus("clean");
      return true;
    } catch (err) {
      const msg = err instanceof StorageError ? err.message : "Local save failed.";
      if (docRef.current?.world.id === d.world.id) {
        setSaveStatus("error");
        setSaveError(msg);
      }
      return false;
    }
  }, []);

  const scheduleAutosave = React.useCallback(() => {
    setSaveStatus("dirty");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void persistNow();
    }, 1500);
  }, [persistNow]);

  React.useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const updateDoc = React.useCallback(
    (fn: (d: WorldDoc) => void) => {
      setDoc((prev) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        fn(next);
        next.world.updatedAt = new Date().toISOString();
        return next;
      });
      setSaveError(null);
      scheduleAutosave();
    },
    [scheduleAutosave],
  );

  const editWorld = React.useCallback(
    (fn: (w: World) => void) => updateDoc((d) => fn(d.world)),
    [updateDoc],
  );

  /* ------------------------- open / select ------------------------- */
  const openDoc = React.useCallback(async (next: WorldDoc, selectFirst = true) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setDoc(next);
    setSelectedId(selectFirst ? (next.world.locations[0]?.id ?? null) : null);
    setSaveStatus("clean");
    setSaveError(null);
    setRemixError(null);
    setImageError(null);
    setBatchProgress(null);
    setView("workspace");
    // Load cached image URLs for locations with saved art.
    const urls: Record<string, string> = {};
    for (const loc of next.world.locations) {
      const st = next.imageState[loc.id]?.status;
      if (st === "ready" || st === "outdated") {
        try {
          const url = await getImageUrl(next.world.id, loc.id);
          if (url) urls[loc.id] = url;
        } catch {
          /* missing blob: UI offers regeneration */
        }
      }
    }
    setImageUrls(urls);
  }, []);

  /* ------------------------- generation ------------------------- */
  const handleGenerateWorld = React.useCallback(
    async (idea: string, genre: string, tone: string, platforms: Platform[]) => {
      if (generating) return;
      setGenerating(true);
      setCreateError(null);
      try {
        const res = await fetch("/api/generate-world", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea, genre, tone }),
        });
        if (!res.ok) {
          setCreateError(await parseApiError(res, "World generation failed. Try again."));
          return;
        }
        const body = (await res.json()) as { world?: unknown };
        const parsed = WorldSchema.safeParse(body.world);
        if (!parsed.success) {
          setCreateError(
            `The server returned invalid world data (${formatZodError(parsed.error)}). Try again — nothing was overwritten.`,
          );
          return;
        }
        const next = docFromWorld(parsed.data, "live", platforms);
        await putWorld(next);
        await openDoc(next);
      } catch {
        setCreateError("Could not reach the server. Check your connection and try again.");
      } finally {
        setGenerating(false);
      }
    },
    [generating, openDoc],
  );

  const handleSample = React.useCallback(() => {
    const sample = makeSampleDoc();
    sample.world.id = newWorldId("sample");
    const now = new Date().toISOString();
    sample.world.createdAt = now;
    sample.world.updatedAt = now;
    void putWorld(sample).catch(() => {
      /* sample still opens even if the save fails */
    });
    void openDoc(sample);
    // Fill in bundled sample art (labeled SAMPLE ART, never live art).
    void (async () => {
      const worldId = sample.world.id;
      let filled = false;
      for (const loc of sample.world.locations) {
        const path = SAMPLE_ART[loc.id];
        if (!path) continue;
        try {
          const res = await fetch(path);
          if (!res.ok) continue;
          const blob = await res.blob();
          const stamped = new Date().toISOString();
          await putImage({
            key: `${worldId}/${loc.id}`,
            worldId,
            locationId: loc.id,
            mime: blob.type || "image/jpeg",
            blob,
            updatedAt: stamped,
          });
          const url = await getImageUrl(worldId, loc.id);
          if (docRef.current?.world.id !== worldId) continue;
          if (url) setImageUrls((prev) => ({ ...prev, [loc.id]: url }));
          setDoc((prev) => {
            if (!prev || prev.world.id !== worldId) return prev;
            const next = structuredClone(prev);
            next.imageState[loc.id] = { status: "ready", updatedAt: stamped, bundled: true };
            return next;
          });
          filled = true;
        } catch {
          /* art stays empty; user can generate live art instead */
        }
      }
      if (filled && docRef.current?.world.id === worldId) void persistNow();
    })();
  }, [openDoc, persistNow]);

  /* ------------------------- remix ------------------------- */
  const handleRemix = React.useCallback(
    async (locationId: string, instruction: string) => {
      const current = docRef.current;
      if (!current || remixPending) return;
      setRemixPending(true);
      setRemixError(null);
      try {
        const res = await fetch("/api/remix-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ world: current.world, locationId, instruction }),
        });
        if (!res.ok) {
          setRemixError(await parseApiError(res, "Remix failed. Your existing work is untouched."));
          return;
        }
        const body = (await res.json()) as { location?: Record<string, unknown> };
        const loc = body.location;
        if (!loc || typeof loc !== "object") {
          setRemixError("The server returned an unreadable remix. Your existing work is untouched.");
          return;
        }
        updateDoc((d) => {
          const target = d.world.locations.find((l) => l.id === locationId);
          if (!target) return;
          // Only creative fields change; stable ID, map position, and links stay.
          if (typeof loc.name === "string") target.name = loc.name.slice(0, 80);
          if (typeof loc.description === "string") target.description = loc.description.slice(0, 1200);
          if (typeof loc.category === "string") target.category = loc.category.slice(0, 60);
          if (Array.isArray(loc.keyProps)) {
            target.keyProps = loc.keyProps.filter((p): p is string => typeof p === "string").slice(0, 10);
          }
          if (typeof loc.imagePrompt === "string") target.imagePrompt = loc.imagePrompt.slice(0, 1500);
          const st = d.imageState[locationId]?.status;
          if (st === "ready") {
            d.imageState[locationId] = { status: "outdated", updatedAt: new Date().toISOString() };
          }
        });
      } catch {
        setRemixError("Could not reach the server. Your existing work is untouched.");
      } finally {
        setRemixPending(false);
      }
    },
    [remixPending, updateDoc],
  );

  /* ------------------------- images ------------------------- */
  const runImageGeneration = React.useCallback(
    async (locationId: string): Promise<boolean> => {
      const current = docRef.current;
      if (!current) return false;
      if ((current.imageState[locationId]?.status ?? "none") === "pending") return false;

      setImageError(null);
      setDoc((prev) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        next.imageState[locationId] = { status: "pending" };
        return next;
      });

      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ world: docRef.current?.world, locationId }),
        });
        if (!res.ok) {
          const msg = await parseApiError(res, "Image generation failed.");
          setDoc((prev) => {
            if (!prev) return prev;
            const next = structuredClone(prev);
            next.imageState[locationId] = { status: "failed", error: msg.slice(0, 300) };
            return next;
          });
          scheduleAutosave();
          return false;
        }
        const body = (await res.json()) as { mime?: string; base64?: string };
        if (typeof body.base64 !== "string" || !body.base64) {
          throw new Error("empty image payload");
        }
        const mime = typeof body.mime === "string" ? body.mime : "image/webp";
        const worldId = docRef.current?.world.id;
        if (!worldId) return false;
        const blob = base64ToBlob(body.base64, mime);
        const now = new Date().toISOString();
        dropImageUrl(worldId, locationId);
        await putImage({ key: `${worldId}/${locationId}`, worldId, locationId, mime, blob, updatedAt: now });
        const url = await getImageUrl(worldId, locationId);
        if (url) setImageUrls((prev) => ({ ...prev, [locationId]: url }));
        setDoc((prev) => {
          if (!prev) return prev;
          const next = structuredClone(prev);
          next.imageState[locationId] = { status: "ready", updatedAt: now };
          next.world.updatedAt = now;
          return next;
        });
        scheduleAutosave();
        return true;
      } catch (err) {
        const msg =
          err instanceof StorageError
            ? err.message
            : "Image generation failed. The world is untouched.";
        setDoc((prev) => {
          if (!prev) return prev;
          const next = structuredClone(prev);
          next.imageState[locationId] = { status: "failed", error: msg.slice(0, 300) };
          return next;
        });
        scheduleAutosave();
        return false;
      }
    },
    [scheduleAutosave],
  );

  const handleGenerateImage = React.useCallback(
    (locationId: string) => {
      void runImageGeneration(locationId);
    },
    [runImageGeneration],
  );

  /** Bounded sequential queue: at most one request in flight, max 5. */
  const handleGenerateAllImages = React.useCallback(async () => {
    const current = docRef.current;
    if (!current || batchRunning) return;
    setBatchRunning(true);
    setImageError(null);
    const ids = current.world.locations.map((l) => l.id).slice(0, 5);
    let done = 0;
    let failed = 0;
    for (const id of ids) {
      setBatchProgress(`Generating concept art ${done + 1} of ${ids.length}…`);
      const ok = await runImageGeneration(id);
      if (ok) done += 1;
      else failed += 1;
    }
    setBatchProgress(null);
    setBatchRunning(false);
    if (failed > 0) {
      setImageError(
        `${failed} of ${ids.length} images failed. Your world and successful images are safe — retry the failed ones individually.`,
      );
    }
  }, [batchRunning, runImageGeneration]);

  /* ------------------------- map & connections ------------------------- */
  const handleMove = React.useCallback(
    (id: string, pos: MapPos) => {
      setDoc((prev) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        next.positions[id] = pos;
        return next;
      });
      scheduleAutosave();
    },
    [scheduleAutosave],
  );

  const handleResetLayout = React.useCallback(() => {
    updateDoc((d) => {
      d.positions = positionsFor(d.world.locations.map((l) => l.id));
    });
  }, [updateDoc]);

  const handleAddConnection = React.useCallback(
    (from: string, to: string) => {
      const current = docRef.current;
      if (!current) return;
      setImageError(null);
      if (from === to) {
        setImageError("A location cannot connect to itself.");
        return;
      }
      const ids = new Set(current.world.locations.map((l) => l.id));
      if (!ids.has(from) || !ids.has(to)) {
        setImageError("That connection references an unknown location.");
        return;
      }
      const key = [from, to].sort().join("|");
      const dup = current.world.connections.some((c) => [c.from, c.to].sort().join("|") === key);
      if (dup) {
        setImageError("Those locations are already connected.");
        return;
      }
      if (current.world.connections.length >= 12) {
        setImageError("Connection limit reached (12). Remove one first.");
        return;
      }
      updateDoc((d) => {
        d.world.connections.push({ from, to });
      });
    },
    [updateDoc],
  );

  const handleRemoveConnection = React.useCallback(
    (index: number) => {
      updateDoc((d) => {
        d.world.connections.splice(index, 1);
      });
    },
    [updateDoc],
  );

  /* ------------------------- import / export ------------------------- */
  const handleImportFile = React.useCallback(
    async (file: File) => {
      setCreateError(null);
      try {
        const text = await file.text();
        if (text.length > 1_000_000) {
          setCreateError("That file is too large to import (limit 1 MB).");
          return;
        }
        const raw: unknown = JSON.parse(text);
        const candidate =
          raw && typeof raw === "object" && "doc" in raw
            ? (raw as { doc: unknown }).doc
            : raw;
        const parsed = WorldDocSchema.safeParse(candidate);
        if (!parsed.success) {
          setCreateError(`Import rejected: ${formatZodError(parsed.error)}`);
          return;
        }
        const imported = parsed.data;
        imported.source = "imported";
        // Never overwrite an existing save on ID collision: import as a copy.
        const existing = await getWorld(imported.world.id).catch(() => null);
        if (existing) {
          imported.world.id = newWorldId("imported");
          const now = new Date().toISOString();
          imported.world.createdAt = now;
          imported.world.updatedAt = now;
        }
        // Imported docs carry metadata only — drop stale image state safely.
        for (const [locId, meta] of Object.entries(imported.imageState)) {
          if (meta.status === "ready" || meta.status === "outdated") {
            const row = await getImage(imported.world.id, locId).catch(() => null);
            if (!row) imported.imageState[locId] = { status: "none" };
          }
        }
        await putWorld(imported);
        await openDoc(imported);
      } catch {
        setCreateError("Import failed: that file is not a valid WorldForge JSON export.");
      }
    },
    [openDoc],
  );

  const handleExportJson = React.useCallback(() => {
    const current = docRef.current;
    if (!current || exporting) return;
    setExporting("json");
    try {
      downloadText(buildWorldJson(current), `${slugify(current.world.name)}-world.json`);
    } finally {
      setExporting(null);
    }
  }, [exporting]);

  const handleExportSvg = React.useCallback(() => {
    const current = docRef.current;
    if (!current || exporting) return;
    setExporting("svg");
    try {
      downloadText(buildMapSvg(current), `${slugify(current.world.name)}-map.svg`, "image/svg+xml");
    } finally {
      setExporting(null);
    }
  }, [exporting]);

  const handleExportZip = React.useCallback(async () => {
    const current = docRef.current;
    if (!current || exporting) return;
    setExporting("zip");
    setImageError(null);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      zip.file("world.json", buildWorldJson(current));
      zip.file("map.svg", buildMapSvg(current));
      zip.file("world-bible.md", buildWorldBibleMd(current));
      zip.file("platforms.md", buildPlatformsMd(current));
      zip.file("README.md", buildKitReadme(current));
      for (const loc of current.world.locations) {
        const st = current.imageState[loc.id]?.status;
        if (st === "ready" || st === "outdated") {
          const row = await getImage(current.world.id, loc.id).catch(() => null);
          if (row) {
            const ext = row.mime === "image/png" ? "png" : row.mime === "image/jpeg" ? "jpg" : "webp";
            zip.file(`images/${loc.id}-${slugify(loc.name)}.${ext}`, row.blob);
          }
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${slugify(current.world.name)}-world-kit.zip`);
    } catch {
      setImageError("ZIP export failed. Try the JSON export instead.");
    } finally {
      setExporting(null);
    }
  }, [exporting]);

  const handlePrint = React.useCallback(() => {
    window.print();
  }, []);

  /* ------------------------- saved worlds ------------------------- */
  const refreshSaved = React.useCallback(async () => {
    setSavedLoading(true);
    setSavedError(null);
    try {
      setSaved(await listWorlds());
    } catch (err) {
      setSavedError(err instanceof StorageError ? err.message : "Could not load saved worlds.");
    } finally {
      setSavedLoading(false);
    }
  }, []);

  const goSaved = React.useCallback(() => {
    setView("saved");
    void refreshSaved();
  }, [refreshSaved]);

  const handleBackFromWorkspace = React.useCallback(async () => {
    await persistNow();
    goSaved();
  }, [persistNow, goSaved]);

  /** Shell navigation: never strand unsaved work — persist before leaving. */
  const handleNavigate = React.useCallback(
    (v: View) => {
      if (v === "workspace") {
        if (docRef.current) setView("workspace");
        return;
      }
      if (v === "saved") {
        void handleBackFromWorkspace();
        return;
      }
      void persistNow().then(() => setView("create"));
    },
    [persistNow, handleBackFromWorkspace],
  );

  const handleOpenSaved = React.useCallback(
    async (id: string) => {
      setSavedError(null);
      try {
        const row = await getWorld(id);
        if (!row) {
          setSavedError("That saved world no longer exists.");
          void refreshSaved();
          return;
        }
        await openDoc(row.doc, false);
        setSelectedId(row.doc.world.locations[0]?.id ?? null);
      } catch (err) {
        setSavedError(err instanceof StorageError ? err.message : "Could not open that world.");
      }
    },
    [openDoc, refreshSaved],
  );

  const handleRename = React.useCallback(
    async (id: string, name: string) => {
      try {
        const row = await getWorld(id);
        if (!row) return;
        row.doc.world.name = name;
        row.doc.world.updatedAt = new Date().toISOString();
        await putWorld(row.doc);
        await refreshSaved();
      } catch (err) {
        setSavedError(err instanceof StorageError ? err.message : "Rename failed.");
      }
    },
    [refreshSaved],
  );

  const handleDuplicate = React.useCallback(
    async (id: string) => {
      try {
        const row = await getWorld(id);
        if (!row) return;
        const copy = structuredClone(row.doc);
        const oldId = copy.world.id;
        copy.world.id = newWorldId("world");
        copy.world.name = `${copy.world.name} (copy)`.slice(0, 100);
        copy.world.updatedAt = new Date().toISOString();
        // Copy image blobs to the new world id.
        for (const loc of copy.world.locations) {
          const st = copy.imageState[loc.id]?.status;
          if (st === "ready" || st === "outdated") {
            const src = await getImage(oldId, loc.id).catch(() => null);
            if (src) {
              await putImage({
                key: `${copy.world.id}/${loc.id}`,
                worldId: copy.world.id,
                locationId: loc.id,
                mime: src.mime,
                blob: src.blob,
                updatedAt: src.updatedAt,
              });
            } else {
              copy.imageState[loc.id] = { status: "none" };
            }
          }
        }
        await putWorld(copy);
        await refreshSaved();
      } catch (err) {
        setSavedError(err instanceof StorageError ? err.message : "Duplicate failed.");
      }
    },
    [refreshSaved],
  );

  const handleDelete = React.useCallback(
    async (id: string) => {
      try {
        dropWorldImageUrls(id);
        await dbDeleteWorld(id);
        await deleteWorldImages(id);
        if (docRef.current?.world.id === id) {
          setDoc(null);
          setView("create");
        }
        await refreshSaved();
      } catch (err) {
        setSavedError(err instanceof StorageError ? err.message : "Delete failed.");
      }
    },
    [refreshSaved],
  );

  /* ------------------------- render ------------------------- */
  return (
    <main className="min-h-screen">
      <div className="no-print">
        <AppNav
          view={view}
          docOpen={doc !== null}
          worldName={doc?.world.name ?? null}
          onNavigate={handleNavigate}
        />
      </div>

      {view === "create" && (
        <div className="no-print">
          <CreateView
            generating={generating}
            error={createError}
            liveReady={liveReady}
            onGenerate={handleGenerateWorld}
            onSample={handleSample}
            onImport={(f) => void handleImportFile(f)}
            onInteract={() => void ensureStatus()}
          />
        </div>
      )}

      {view === "saved" && (
        <div className="no-print">
          <SavedView
            worlds={saved}
            loading={savedLoading}
            error={savedError}
            onOpen={(id) => void handleOpenSaved(id)}
            onRename={(id, name) => void handleRename(id, name)}
            onDuplicate={(id) => void handleDuplicate(id)}
            onDelete={(id) => void handleDelete(id)}
          />
        </div>
      )}

      {view === "workspace" && doc && (
        <WorkspaceView
          doc={doc}
          selectedId={selectedId}
          saveStatus={saveStatus}
          saveError={saveError}
          imageUrls={imageUrls}
          remixPending={remixPending}
          remixError={remixError}
          batchRunning={batchRunning}
          batchProgress={batchProgress}
          imageError={imageError}
          exporting={exporting}
          actions={{
            onSelect: setSelectedId,
            onMove: handleMove,
            onEditWorld: editWorld,
            onEditDoc: updateDoc,
            onRemix: (id, text) => void handleRemix(id, text),
            onGenerateImage: handleGenerateImage,
            onGenerateAllImages: () => void handleGenerateAllImages(),
            onResetLayout: handleResetLayout,
            onAddConnection: handleAddConnection,
            onRemoveConnection: handleRemoveConnection,
            onSave: () => void persistNow(),
            onExportJson: handleExportJson,
            onExportSvg: handleExportSvg,
            onPrint: handlePrint,
            onExportZip: () => void handleExportZip(),
          }}
        />
      )}

      {view === "workspace" && !doc && (
        <div className="no-print mx-auto max-w-md px-4 py-20 text-center">
          <p className="text-forge-dim">No world is open.</p>
          <button
            className="mt-4 rounded-lg border border-forge-line px-4 py-2 text-sm hover:bg-forge-panel2"
            onClick={() => setView("create")}
          >
            Back to start
          </button>
        </div>
      )}

      {doc && <PrintSheet doc={doc} imageUrls={imageUrls} />}
    </main>
  );
}
