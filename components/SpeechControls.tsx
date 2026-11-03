"use client";

import React from "react";
import {
  STOP_SPEECH_EVENT,
  createRecognition,
  isSTTSupported,
  isTTSSupported,
  speak,
  stopSpeaking,
} from "@/lib/speech";

function MicGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 19v3" />
    </svg>
  );
}

function SpeakerGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9.5 9.5 0 0 1 0 13" />
    </svg>
  );
}

/** Mic button: dictates one utterance into the parent input. Hidden if unsupported. */
export function MicButton({
  onTranscript,
  disabled = false,
  label = "Dictate",
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [listening, setListening] = React.useState(false);
  // Support is detected post-hydration so the first client render matches SSR (null).
  const [supported, setSupported] = React.useState(false);
  const recRef = React.useRef<ReturnType<typeof createRecognition>>(null);
  const cbRef = React.useRef(onTranscript);
  cbRef.current = onTranscript;

  React.useEffect(() => {
    setSupported(isSTTSupported());
  }, []);

  React.useEffect(() => () => recRef.current?.abort(), []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = createRecognition();
    if (!rec) return;
    recRef.current = rec;
    rec.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript?.trim();
      if (text) cbRef.current(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={listening ? "Stop dictation" : label}
      title={listening ? "Stop dictation" : label}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
        listening
          ? "animate-pulse border-red-400/70 bg-red-400/10 text-red-300"
          : "border-forge-line text-forge-dim hover:border-cyan-400/60 hover:text-slate-200"
      }`}
    >
      <MicGlyph />
    </button>
  );
}

/** Speaker button: reads text aloud. Only one utterance plays at a time. */
export function SpeakButton({ text, label = "Read aloud" }: { text: string; label?: string }) {
  const [speaking, setSpeaking] = React.useState(false);
  // Support is detected post-hydration so the first client render matches SSR (null).
  const [supported, setSupported] = React.useState(false);

  React.useEffect(() => {
    setSupported(isTTSSupported());
    const reset = () => setSpeaking(false);
    window.addEventListener(STOP_SPEECH_EVENT, reset);
    return () => {
      window.removeEventListener(STOP_SPEECH_EVENT, reset);
      stopSpeaking();
    };
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (speaking) {
          stopSpeaking();
          setSpeaking(false);
        } else {
          speak(text, () => setSpeaking(false));
          setSpeaking(true);
        }
      }}
      aria-pressed={speaking}
      aria-label={label}
      title={label}
      className={`rounded-md p-1.5 transition-colors ${
        speaking ? "bg-cyan-400/15 text-cyan-300" : "text-forge-dim hover:bg-forge-panel2 hover:text-slate-200"
      }`}
    >
      <SpeakerGlyph className="h-3.5 w-3.5" />
    </button>
  );
}
