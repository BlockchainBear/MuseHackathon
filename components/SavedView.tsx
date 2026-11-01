"use client";

import React from "react";
import type { SavedWorldRow } from "@/lib/db";
import { Button, Modal, Spinner } from "./ui";

interface SavedViewProps {
  worlds: SavedWorldRow[];
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export function SavedView({ worlds, loading, error, onOpen, onRename, onDuplicate, onDelete, onBack }: SavedViewProps) {
  const [renaming, setRenaming] = React.useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = React.useState<SavedWorldRow | null>(null);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-cyan-400">WORLDFORGE LITE</p>
          <h1 className="mt-1 text-2xl font-extrabold">Saved Worlds</h1>
        </div>
        <Button onClick={onBack}>Back</Button>
      </div>

      {loading && <Spinner label="Loading saved worlds…" />}
      {error && (
        <div role="alert" className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && worlds.length === 0 && (
        <p className="rounded-xl border border-forge-line bg-forge-panel p-6 text-center text-forge-dim">
          No saved worlds yet. Generate a world or load the sample demo to begin.
        </p>
      )}

      <ul className="space-y-3">
        {worlds.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-3 rounded-xl border border-forge-line bg-forge-panel p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-base font-bold">{row.doc.world.name}</p>
              <p className="mt-0.5 text-xs text-forge-dim">
                <span className="uppercase tracking-wide">{row.doc.source}</span>
                {" · "}
                {row.doc.world.genre} · {row.doc.world.tone}
                {" · saved "}
                {new Date(row.savedAt).toLocaleString()}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-forge-dim">{row.doc.world.logline}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="primary" onClick={() => onOpen(row.id)}>
                Open
              </Button>
              <Button onClick={() => setRenaming({ id: row.id, name: row.doc.world.name })}>Rename</Button>
              <Button onClick={() => onDuplicate(row.id)}>Duplicate</Button>
              <Button variant="danger" onClick={() => setDeleting(row)}>
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-forge-dim">
        Saves are stored in this browser&apos;s IndexedDB (this device only, including generated images).
        Use Export → World Kit ZIP for portable backups.
      </p>

      {renaming && (
        <Modal title="Rename world" onClose={() => setRenaming(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (renaming.name.trim()) {
                onRename(renaming.id, renaming.name.trim().slice(0, 100));
                setRenaming(null);
              }
            }}
          >
            <input
              autoFocus
              className="field"
              value={renaming.name}
              maxLength={100}
              onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
              aria-label="New world name"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" onClick={() => setRenaming(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save name
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete world?" onClose={() => setDeleting(null)}>
          <p className="text-sm text-forge-dim">
            Permanently delete <strong className="text-slate-100">“{deleting.doc.world.name}”</strong> and its
            saved images from this browser? This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                onDelete(deleting.id);
                setDeleting(null);
              }}
            >
              Delete permanently
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
