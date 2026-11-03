/**
 * SSR-safe Web Speech helpers: mic dictation (SpeechRecognition) and
 * read-aloud (SpeechSynthesis). Everything runs on explicit user clicks;
 * unsupported browsers simply hide the controls.
 */

export function isTTSSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

export function isSTTSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return typeof w.SpeechRecognition === "function" || typeof w.webkitSpeechRecognition === "function";
}

export interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function createRecognition(): RecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => RecognitionLike)
    | undefined;
  if (typeof Ctor !== "function") return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

/** Fired before any new utterance so other Speak buttons reset. */
export const STOP_SPEECH_EVENT = "wf-stop-speech";

export function speak(text: string, onDone?: () => void): void {
  if (!isTTSSupported()) return;
  window.dispatchEvent(new CustomEvent(STOP_SPEECH_EVENT));
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 2000));
  utterance.rate = 1;
  if (onDone) {
    utterance.onend = onDone;
    utterance.onerror = onDone;
  }
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
