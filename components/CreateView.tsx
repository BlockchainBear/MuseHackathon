"use client";

import React from "react";
import { Button, FieldError, Label, Spinner, UsageWarning } from "./ui";

interface CreateViewProps {
  generating: boolean;
  error: string | null;
  liveReady: boolean | null;
  onGenerate: (idea: string, genre: string, tone: string) => void;
  onSample: () => void;
  onOpenSaved: () => void;
  onImport: (file: File) => void;
  onInteract: () => void;
}

const GENRES = ["Unspecified", "Fantasy", "Sci-Fi", "Urban mystery", "Horror", "Post-apocalyptic", "Cozy", "Historical"];
const TONES = ["Unspecified", "Dark", "Whimsical", "Neon-noir", "Epic", "Melancholic", "Satirical", "Hopeful"];

const EXAMPLE_IDEAS = [
  "A floating archipelago where sky-whales are farmed for stormlight.",
  "A desert city built inside the skeleton of a dead titan.",
  "A cozy village where every house is grown from a different giant mushroom.",
];

export function CreateView({
  generating,
  error,
  liveReady,
  onGenerate,
  onSample,
  onOpenSaved,
  onImport,
  onInteract,
}: CreateViewProps) {
  const [idea, setIdea] = React.useState("");
  const [genre, setGenre] = React.useState("Unspecified");
  const [tone, setTone] = React.useState("Unspecified");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim().length >= 4) onGenerate(idea.trim(), genre, tone);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <p className="text-xs font-bold tracking-[0.2em] text-cyan-400">WORLDFORGE LITE</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
          Turn a game-world idea into a world bible and map.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-forge-dim">
          Describe your world. WorldForge drafts five locations, three NPCs, four quests, an asset
          checklist, and production prompts on an editable map. A planning tool — it does not export
          playable levels.
        </p>
      </header>

      <form onSubmit={submit} onFocus={onInteract} className="rounded-xl border border-forge-line bg-forge-panel p-5">
        <Label htmlFor="idea">Your world idea</Label>
        <textarea
          id="idea"
          className="field min-h-[110px] resize-y"
          placeholder="A Pattaya night market hiding an underground racing league…"
          value={idea}
          maxLength={2000}
          onChange={(e) => setIdea(e.target.value)}
          disabled={generating}
        />
        <div className="mt-2 flex flex-wrap gap-2" aria-label="Example ideas">
          {EXAMPLE_IDEAS.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={generating}
              onClick={() => {
                setIdea(ex);
                onInteract();
              }}
              className="rounded-full border border-forge-line px-3 py-1 text-left text-xs text-forge-dim transition-colors hover:border-cyan-400/60 hover:text-slate-200 disabled:opacity-50"
            >
              {ex.length > 52 ? ex.slice(0, 52) + "…" : ex}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="genre">Genre (optional)</Label>
            <select id="genre" className="field" value={genre} onChange={(e) => setGenre(e.target.value)} disabled={generating}>
              {GENRES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="tone">Tone (optional)</Label>
            <select id="tone" className="field" value={tone} onChange={(e) => setTone(e.target.value)} disabled={generating}>
              {TONES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <UsageWarning />
          {liveReady === false && (
            <p className="text-sm text-forge-dim" role="note">
              No API key detected on the server. Live generation needs a private{" "}
              <code className="rounded bg-forge-panel2 px-1 font-mono text-xs">MODEL_API_KEY</code> in{" "}
              <code className="rounded bg-forge-panel2 px-1 font-mono text-xs">.env.local</code> — or explore the
              sample demo below.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" disabled={generating || idea.trim().length < 4}>
              {generating ? "Generating world…" : "Generate World"}
            </Button>
            {generating && <Spinner label="One request in flight — this can take a minute." />}
          </div>
        </div>
        <FieldError message={error} />
      </form>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Button onClick={onSample} disabled={generating}>
          Load Sample Demo
        </Button>
        <Button onClick={onOpenSaved} disabled={generating}>
          Saved Worlds
        </Button>
        <Button onClick={() => fileRef.current?.click()} disabled={generating}>
          Import JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="mt-4 text-xs leading-relaxed text-forge-dim">
        The sample demo (“Neon Night Market”) works fully offline and is always labeled as sample content.
        Saves live in this browser only — export backups for safekeeping.
      </p>
    </div>
  );
}
