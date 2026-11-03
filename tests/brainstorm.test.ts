import { describe, expect, it } from "vitest";
import {
  callChatText,
  mockChatResponse,
  mockFetch,
  type ProviderConfig,
} from "../lib/provider";
import {
  createRecognition,
  isSTTSupported,
  isTTSSupported,
  speak,
  stopSpeaking,
} from "../lib/speech";

const TEST_CONFIG: ProviderConfig = {
  apiBase: "https://api.meta.ai/v1",
  textModel: "muse-spark-1.3",
  imageModel: "muse-image-1.0",
  apiKey: "LLM_test_fake-key-for-tests",
};

describe("callChatText", () => {
  it("posts plain chat without response_format and returns trimmed text", async () => {
    let seenBody: Record<string, unknown> = {};
    const fetchFn = mockFetch((_url, init) => {
      seenBody = JSON.parse(String(init.body));
      return { choices: [{ message: { content: "  Cool hook — what if the market floods nightly?  " } }] };
    });
    const out = await callChatText({
      system: "sys",
      messages: [{ role: "user", content: "night market world" }],
      fetchFn,
      config: TEST_CONFIG,
    });
    expect(seenBody["model"]).toBe("muse-spark-1.3");
    expect(seenBody).not.toHaveProperty("response_format");
    expect(seenBody["messages"]).toHaveLength(2);
    expect(out).toBe("Cool hook — what if the market floods nightly?");
  });

  it("throws not_configured without an API key", async () => {
    const fetchFn = mockFetch(() => ({}));
    await expect(
      callChatText({
        system: "s",
        messages: [{ role: "user", content: "hi" }],
        fetchFn,
        config: { ...TEST_CONFIG, apiKey: null },
      }),
    ).rejects.toMatchObject({ code: "not_configured", status: 503 });
  });

  it("rejects empty replies", async () => {
    const fetchFn = mockFetch(() => ({ choices: [{ message: { content: "   " } }] }));
    await expect(
      callChatText({
        system: "s",
        messages: [{ role: "user", content: "hi" }],
        fetchFn,
        config: TEST_CONFIG,
      }),
    ).rejects.toMatchObject({ code: "bad_output" });
  });
});

describe("speech helpers (no browser here)", () => {
  it("report unsupported outside a browser and never throw", () => {
    expect(isTTSSupported()).toBe(false);
    expect(isSTTSupported()).toBe(false);
    expect(createRecognition()).toBeNull();
    expect(() => speak("hello")).not.toThrow();
    expect(() => stopSpeaking()).not.toThrow();
  });
});
