"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { Platform } from "@/lib/schema";
import { PLATFORM_META } from "@/lib/platforms";
import { Button, FieldError, Label, Logo, PickChip, Spinner, UsageWarning } from "./ui";
import { MicButton, SpeakButton } from "./SpeechControls";
import {
  AlertIcon,
  ArchiveIcon,
  BookIcon,
  ChevronDownIcon,
  ClockIcon,
  EyeIcon,
  FortniteIcon,
  HorizonIcon,
  LayoutGridIcon,
  RobloxIcon,
  SparklesIcon,
  UploadIcon,
  ZapIcon,
} from "./icons";

const HeroScene = dynamic(() => import("./HeroScene").then((m) => m.HeroScene), { ssr: false });

export const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  horizon: <HorizonIcon className="h-4 w-4" />,
  roblox: <RobloxIcon className="h-4 w-4" />,
  fortnite: <FortniteIcon className="h-4 w-4" />,
};

interface CreateViewProps {
  generating: boolean;
  error: string | null;
  liveReady: boolean | null;
  onGenerate: (idea: string, genre: string, tone: string, platforms: Platform[]) => void;
  onSample: () => void;
  onImport: (file: File) => void;
  onInteract: () => void;
}

const GENRE_OPTIONS: { value: string; icon: React.ReactNode }[] = [
  { value: "Unspecified", icon: <LayoutGridIcon className="h-5 w-5" /> },
  { value: "Fantasy", icon: <SparklesIcon className="h-5 w-5" /> },
  { value: "Sci-Fi", icon: <ZapIcon className="h-5 w-5" /> },
  { value: "Urban mystery", icon: <EyeIcon className="h-5 w-5" /> },
  { value: "Horror", icon: <AlertIcon className="h-5 w-5" /> },
  { value: "Post-apocalyptic", icon: <ArchiveIcon className="h-5 w-5" /> },
  { value: "Cozy", icon: <BookIcon className="h-5 w-5" /> },
  { value: "Historical", icon: <ClockIcon className="h-5 w-5" /> },
];

const TONE_OPTIONS: { value: string; color: string }[] = [
  { value: "Unspecified", color: "#9aa3b2" },
  { value: "Dark", color: "#64748b" },
  { value: "Whimsical", color: "#f9a8d4" },
  { value: "Neon-noir", color: "#22d3ee" },
  { value: "Epic", color: "#fbbf24" },
  { value: "Melancholic", color: "#7dd3fc" },
  { value: "Satirical", color: "#fca5a5" },
  { value: "Hopeful", color: "#86efac" },
];

interface Spark {
  title: string;
  text: string;
  genre: string;
  tone: string;
  art: string;
}

const SPARKS: Spark[] = [
  {
    title: "Sky-Whale Ranch",
    text: "A floating archipelago where sky-whales are farmed for stormlight.",
    genre: "Fantasy",
    tone: "Epic",
    art: "/art/sample/loc-1.jpg",
  },
  {
    title: "Titan-Bone City",
    text: "A desert city built inside the skeleton of a dead titan.",
    genre: "Post-apocalyptic",
    tone: "Epic",
    art: "/art/sample/loc-2.jpg",
  },
  {
    title: "Mushroom Village",
    text: "A cozy village where every house is grown from a giant mushroom.",
    genre: "Cozy",
    tone: "Whimsical",
    art: "/art/sample/loc-3.jpg",
  },
  {
    title: "Memory Market",
    text: "A neon night market where memories are bought, sold, and stolen.",
    genre: "Sci-Fi",
    tone: "Neon-noir",
    art: "/art/sample/loc-4.jpg",
  },
  {
    title: "Between Lighthouse",
    text: "A lighthouse that guides ships sailing between worlds.",
    genre: "Fantasy",
    tone: "Melancholic",
    art: "/art/sample/loc-5.jpg",
  },
  {
    title: "Eclipse Carnival",
    text: "A traveling carnival that only appears during a total eclipse.",
    genre: "Urban mystery",
    tone: "Dark",
    art: "/art/hero.jpg",
  },
];

const OPENERS = [
  "A floating archipelago where sky-whales are farmed for stormlight.",
  "A desert city built inside the skeleton of a dead titan.",
  "A cozy village where every house is grown from a giant mushroom.",
];

const NUDGES = ["Give me a twist", "Darker", "Funnier", "What's the hook?"];

const ALL: Platform[] = ["horizon", "roblox", "fortnite"];

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

const GREETING: ChatMsg = {
  role: "assistant",
  text: "Yo — pitch me a world. One line is enough. I'll riff with you, then we hit Generate.",
};

export function CreateView({
  generating,
  error,
  liveReady,
  onGenerate,
  onSample,
  onImport,
  onInteract,
}: CreateViewProps) {
  const [riffOpen, setRiffOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMsg[]>([GREETING]);
  const [draft, setDraft] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const [chatError, setChatError] = React.useState<string | null>(null);
  const [idea, setIdea] = React.useState("");
  const [genre, setGenre] = React.useState("Unspecified");
  const [tone, setTone] = React.useState("Unspecified");
  const [platforms, setPlatforms] = React.useState<Platform[]>(ALL);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const threadRef = React.useRef<HTMLDivElement>(null);
  const messagesRef = React.useRef(messages);
  messagesRef.current = messages;

  React.useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) => {
      if (prev.includes(p)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== p);
      }
      return [...prev, p];
    });
  };

  const send = (raw: string) => {
    const text = raw.trim().slice(0, 2000);
    if (!text || thinking || generating) return;
    onInteract();
    const next = [...messagesRef.current, { role: "user" as const, text }].slice(-20);
    messagesRef.current = next;
    setMessages(next);
    setDraft("");
    setChatError(null);
    if (!idea.trim()) setIdea(text);
    setThinking(true);
    fetch("/api/brainstorm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.text })) }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res
            .json()
            .then((b) => (typeof b?.error === "string" ? b.error : "Brainstorm failed."))
            .catch(() => "Brainstorm failed.");
          throw new Error(msg);
        }
        return res.json() as Promise<{ reply?: unknown }>;
      })
      .then((body) => {
        const reply = typeof body.reply === "string" && body.reply ? body.reply : "Lost my train of thought — say that again?";
        const updated = [...messagesRef.current, { role: "assistant" as const, text: reply }].slice(-20);
        messagesRef.current = updated;
        setMessages(updated);
      })
      .catch((err: unknown) => {
        setChatError(err instanceof Error ? err.message : "Brainstorm failed. You can still type your pitch below.");
      })
      .finally(() => setThinking(false));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim().length >= 4) onGenerate(idea.trim(), genre, tone, platforms);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* hero */}
      <div
        className="relative overflow-hidden rounded-2xl border border-forge-line bg-cover bg-center"
        style={{ backgroundImage: "url(/art/hero.jpg)" }}
      >
        <HeroScene className="relative h-44 w-full sm:h-52" />
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-forge-bg via-forge-bg/40 to-transparent p-5">
          <Logo />
          <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">
            Dream it out loud. Ship a world.
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Build targets">
            {ALL.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 rounded-full border border-forge-line bg-black/50 px-2.5 py-1 text-xs font-bold"
                style={{ color: PLATFORM_META[p].color }}
              >
                {PLATFORM_ICONS[p]}
                <span className="text-slate-100">{PLATFORM_META[p].name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* pitch → generate */}
      <form onSubmit={submit} onFocus={onInteract} className="mt-3 rounded-xl border border-forge-line bg-forge-panel p-4 sm:p-5">
        <Label>Start from a spark — one tap fills the pitch</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Starter ideas">
          {SPARKS.map((s) => {
            const active = idea === s.text;
            return (
              <button
                key={s.title}
                type="button"
                disabled={generating}
                onClick={() => {
                  onInteract();
                  setIdea(s.text);
                  setGenre(s.genre);
                  setTone(s.tone);
                }}
                aria-pressed={active}
                title={`${s.text} (${s.genre} · ${s.tone})`}
                className={`group overflow-hidden rounded-lg border text-left transition-colors disabled:opacity-50 ${
                  active
                    ? "border-cyan-400/70 ring-1 ring-cyan-400/50"
                    : "border-forge-line hover:border-cyan-400/50"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.art} alt="" aria-hidden className="h-16 w-full object-cover sm:h-20" loading="lazy" />
                <span className="block px-2 py-1.5">
                  <span className={`block truncate text-xs font-bold ${active ? "text-cyan-200" : "text-slate-200"}`}>
                    {s.title}
                  </span>
                  <span className="block truncate text-[11px] text-forge-dim">
                    {s.genre} · {s.tone}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <Label htmlFor="idea">The pitch</Label>
          <textarea
            id="idea"
            className="field min-h-[70px] resize-y"
            placeholder="Your world in one or two lines — tap a spark, or steal one from the chat."
            value={idea}
            maxLength={2000}
            onChange={(e) => setIdea(e.target.value)}
            disabled={generating}
          />
        </div>

        <div className="mt-3">
          <Label>Build for</Label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Target platforms">
            {ALL.map((p) => {
              const on = platforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  disabled={generating}
                  aria-pressed={on}
                  onClick={() => togglePlatform(p)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors disabled:opacity-50 ${
                    on
                      ? "border-cyan-400/60 bg-cyan-400/10 text-slate-100"
                      : "border-forge-line text-forge-dim hover:text-slate-200"
                  }`}
                >
                  <span style={{ color: PLATFORM_META[p].color }}>{PLATFORM_ICONS[p]}</span>
                  {PLATFORM_META[p].short}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <Label>Genre — tap one</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Genre">
            {GENRE_OPTIONS.map((g) => {
              const on = genre === g.value;
              return (
                <button
                  key={g.value}
                  type="button"
                  disabled={generating}
                  aria-pressed={on}
                  onClick={() => setGenre(g.value)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-bold transition-colors disabled:opacity-50 ${
                    on
                      ? "border-cyan-400/70 bg-cyan-400/10 text-cyan-200"
                      : "border-forge-line text-forge-dim hover:border-cyan-400/40 hover:text-slate-100"
                  }`}
                >
                  <span className={on ? "text-cyan-300" : "text-forge-dim"}>{g.icon}</span>
                  <span className="leading-tight">{g.value}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3">
          <Label>Tone — tap one</Label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tone">
            {TONE_OPTIONS.map((t) => (
              <PickChip key={t.value} selected={tone === t.value} disabled={generating} onClick={() => setTone(t.value)}>
                <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: t.color }} />
                {t.value}
              </PickChip>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <UsageWarning />
          {liveReady === false && (
            <p className="text-sm text-forge-dim" role="note">
              No API key on the server — brainstorm and generation need{" "}
              <code className="rounded bg-forge-panel2 px-1 font-mono text-xs">MODEL_API_KEY</code>, or try the sample.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" disabled={generating || idea.trim().length < 4}>
              <SparklesIcon />
              {generating ? "Generating…" : "Generate World"}
            </Button>
            {generating && <Spinner label="One request in flight." />}
          </div>
        </div>
        <FieldError message={error} />
      </form>

      {/* riff panel: opt-in brainstorming, collapsed by default */}
      <div className="mt-3 overflow-hidden rounded-xl border border-forge-line bg-forge-panel">
        <button
          type="button"
          onClick={() => setRiffOpen((v) => !v)}
          aria-expanded={riffOpen}
          className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-forge-panel2/50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forge-purple/15 text-forge-purple">
            <SparklesIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Riff with an AI partner</span>
            <span className="block truncate text-xs text-forge-dim">
              {messages.length > 1
                ? `${messages.length - 1} exchange${messages.length > 2 ? "s" : ""} so far — pick it back up`
                : "Stuck? Chat or talk it out, then capture the pitch"}
            </span>
          </span>
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 text-forge-dim transition-transform ${riffOpen ? "rotate-180" : ""}`}
          />
        </button>
        {riffOpen && (
          <div className="border-t border-forge-line p-4">
            <div ref={threadRef} className="nice-scroll max-h-72 space-y-3 overflow-y-auto pr-1" aria-live="polite" aria-label="Brainstorm conversation">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex flex-col items-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-cyan-400/15 px-3.5 py-2 text-sm text-slate-100">
                      {m.text}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIdea(m.text)}
                      className="mt-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-forge-dim hover:bg-forge-panel2 hover:text-cyan-300"
                    >
                      Use as pitch ↑
                    </button>
                  </div>
                ) : (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forge-purple/15 text-forge-purple">
                      <SparklesIcon className="h-3.5 w-3.5" />
                    </span>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-forge-panel2 px-3.5 py-2 text-sm text-slate-200">
                      {m.text}
                    </div>
                    <SpeakButton text={m.text} label="Read reply aloud" />
                  </div>
                ),
              )}
              {thinking && (
                <div className="flex items-center gap-2 pl-9">
                  <Spinner label="Riffing…" />
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick nudges">
              {NUDGES.map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={thinking || generating}
                  onClick={() => send(n)}
                  className="rounded-full border border-forge-line px-2.5 py-1 text-xs text-forge-dim transition-colors hover:border-forge-purple/60 hover:text-slate-200 disabled:opacity-50"
                >
                  {n}
                </button>
              ))}
            </div>

            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
            >
              <MicButton onTranscript={(t) => setDraft((d) => (d ? `${d} ${t}` : t))} disabled={thinking || generating} />
              <input
                className="field min-w-0 flex-1"
                value={draft}
                maxLength={2000}
                disabled={thinking || generating}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type or speak your idea…"
                aria-label="Brainstorm message"
              />
              <Button type="submit" variant="primary" disabled={thinking || generating || draft.trim().length < 1}>
                Send
              </Button>
            </form>
            {chatError && (
              <p className="mt-2 text-sm text-amber-200/90" role="alert">
                {chatError}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2" aria-label="Conversation starters">
              {OPENERS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  disabled={thinking || generating}
                  onClick={() => send(ex)}
                  className="rounded-full border border-dashed border-forge-line px-3 py-1 text-left text-xs text-forge-dim transition-colors hover:border-cyan-400/60 hover:text-slate-200 disabled:opacity-50"
                >
                  Try: {ex.length > 48 ? `${ex.slice(0, 48)}…` : ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button onClick={onSample} disabled={generating}>
          <ZapIcon /> Sample Demo
        </Button>
        <Button onClick={() => fileRef.current?.click()} disabled={generating}>
          <UploadIcon /> Import JSON
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
    </div>
  );
}
