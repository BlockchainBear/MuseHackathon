import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MicButton, SpeakButton } from "../components/SpeechControls";

/**
 * Hydration contract: the first client render must match the server HTML.
 * Effects never run during SSR (or the hydration pass), so renderToString
 * with stubbed browser APIs reproduces exactly what hydration compares.
 * If support is detected during render, the client emits a <button> the
 * server never sent and React throws a hydration mismatch.
 */
function stubSpeechBrowser(): () => void {
  const g = globalThis as unknown as Record<string, unknown>;
  const prevWindow = g["window"];
  const prevCtor = g["SpeechSynthesisUtterance"];
  g["window"] = { speechSynthesis: {}, SpeechRecognition: function () {} };
  g["SpeechSynthesisUtterance"] = function () {};
  return () => {
    if (prevWindow === undefined) delete g["window"];
    else g["window"] = prevWindow;
    if (prevCtor === undefined) delete g["SpeechSynthesisUtterance"];
    else g["SpeechSynthesisUtterance"] = prevCtor;
  };
}

describe("speech buttons hydration", () => {
  it("SpeakButton first render emits no button even when synthesis exists", () => {
    const restore = stubSpeechBrowser();
    try {
      const html = renderToString(createElement(SpeakButton, { text: "hello world" }));
      expect(html).not.toContain("<button");
    } finally {
      restore();
    }
  });

  it("MicButton first render emits no button even when recognition exists", () => {
    const restore = stubSpeechBrowser();
    try {
      const html = renderToString(createElement(MicButton, { onTranscript: () => {} }));
      expect(html).not.toContain("<button");
    } finally {
      restore();
    }
  });

  it("speech buttons render nothing without browser APIs (plain SSR)", () => {
    expect(renderToString(createElement(SpeakButton, { text: "hi" }))).toBe("");
    expect(renderToString(createElement(MicButton, { onTranscript: () => {} }))).toBe("");
  });
});
