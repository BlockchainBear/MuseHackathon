"use client";

import React from "react";
import type { SavedWorldRow } from "@/lib/db";
import { Button, Modal, Spinner } from "./ui";
import { CopyIcon, EyeIcon, FolderIcon, PencilIcon, TrashIcon } from "./icons";

interface SavedViewProps {
  worlds: SavedWorldRow[];
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SavedView({ worlds, loading, error, onOpen, onRename, onDuplicate, onDelete }: SavedViewProps) {
  const [renaming, setRenaming] = React.useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = React.useState<SavedWorldRow | null>(null);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Saved Worlds</h1>
        {!loading && !error && worlds.length > 0 && (
          <span className="tabular rounded-full bg-forge-panel2 px-2.5 py-0.5 text-xs font-bold text-forge-dim">
            {worlds.length}
          </span>
        )}
      </div>

      {loading && <Spinner label="Loading…" />}
      {error && (
        <div role="alert" className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && worlds.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-forge-line bg-forge-panel p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
            <FolderIcon className="h-7 w-7" />
          </span>
          <p className="font-bold">No worlds yet</p>
          <p className="max-w-xs text-sm text-forge-dim">Generate a world or load the sample to start building.</p>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {worlds.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-3 rounded-xl border border-forge-line bg-forge-panel p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold">{row.doc.world.name}</p>
              <p className="mt-0.5 text-xs uppercase tracking-wide text-forge-dim">
                {row.doc.source} · {row.doc.world.genre} · {new Date(row.savedAt).toLocaleDateString()}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-forge-dim">{row.doc.world.logline}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="primary" onClick={() => onOpen(row.id)}>
                <EyeIcon /> Open
              </Button>
              <Button onClick={() => setRenaming({ id: row.id, name: row.doc.world.name })} title="Rename">
                <PencilIcon />
                <span className="sm:hidden">Rename</span>
              </Button>
              <Button onClick={() => onDuplicate(row.id)} title="Duplicate">
                <CopyIcon />
                <span className="sm:hidden">Copy</span>
              </Button>
              <Button variant="danger" onClick={() => setDeleting(row)} title="Delete">
                <TrashIcon />
                <span className="sm:hidden">Delete</span>
              </Button>
            </div>
          </li>
        ))}
      </ul>

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
            saved images? Cannot be undone.
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
              <TrashIcon /> Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
