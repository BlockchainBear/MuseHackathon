import { describe, expect, it } from "vitest";
import {
  MOCK_IMAGE_BASE64,
  REMIX_JSON_SCHEMA,
  WORLD_CONTENT_JSON_SCHEMA,
  buildImagePrompt,
  callImageModel,
  callTextModel,
  mockChatResponse,
  mockFetch,
  mockImageResponse,
  scrub,
  sniffImageMime,
  ProviderError,
  type ProviderConfig,
} from "../lib/provider";
import { mockGeneratedContent } from "../lib/sample";

const TEST_CONFIG: ProviderConfig = {
  apiBase: "https://api.meta.ai/v1",
  textModel: "muse-spark-1.3",
  imageModel: "muse-image-1.0",
  apiKey: "LLM_test_fake-key-for-tests",
};

describe("callTextModel", () => {
  it("posts to chat/completions and parses constrained JSON", async () => {
    const content = mockGeneratedContent("idea", "Fantasy", "Dark");
    let seenUrl = "";
    let seenBody: Record<string, unknown> = {};
    const fetchFn = mockFetch((url, init) => {
      seenUrl = url;
      seenBody = JSON.parse(String(init.body));
      return mockChatResponse(content);
    });
    const out = await callTextModel({
      system: "sys",
      user: "user",
      schema: WORLD_CONTENT_JSON_SCHEMA,
      fetchFn,
      config: TEST_CONFIG,
    });
    expect(seenUrl).toBe("https://api.meta.ai/v1/chat/completions");
    expect(seenBody["model"]).toBe("muse-spark-1.3");
    expect(seenBody["response_format"]).toMatchObject({ type: "json_schema" });
    expect(out).toMatchObject({ name: expect.any(String) });
  });

  it("throws not_configured without an API key (never calls fetch)", async () => {
    let called = false;
    const fetchFn = mockFetch(() => {
      called = true;
      return {};
    });
    await expect(
      callTextModel({
        system: "s",
        user: "u",
        schema: REMIX_JSON_SCHEMA,
        fetchFn,
        config: { ...TEST_CONFIG, apiKey: null },
      }),
    ).rejects.toMatchObject({ code: "not_configured", status: 503 });
    expect(called).toBe(false);
  });

  it("maps auth failures to a safe message", async () => {
    const fetchFn = (async () =>
      new Response("bad key LLM_123_secret", { status: 401 })) as typeof fetch;
    const err = (await callTextModel({
      system: "s",
      user: "u",
      schema: REMIX_JSON_SCHEMA,
      fetchFn,
      config: TEST_CONFIG,
    }).catch((e) => e)) as ProviderError;
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.code).toBe("auth");
    expect(err.message).not.toMatch(/LLM_123/);
  });

  it("rejects malformed model JSON", async () => {
    const fetchFn = mockFetch(() => ({ choices: [{ message: { content: "not json{{" } }] }));
    await expect(
      callTextModel({ system: "s", user: "u", schema: REMIX_JSON_SCHEMA, fetchFn, config: TEST_CONFIG }),
    ).rejects.toMatchObject({ code: "bad_output" });
  });
});

describe("callImageModel", () => {
  it("posts to /responses and extracts the base64 image item by type", async () => {
    let seenUrl = "";
    let seenBody: Record<string, unknown> = {};
    const fetchFn = mockFetch((url, init) => {
      seenUrl = url;
      seenBody = JSON.parse(String(init.body));
      return mockImageResponse();
    });
    const out = await callImageModel({ prompt: "a fox", fetchFn, config: TEST_CONFIG });
    expect(seenUrl).toBe("https://api.meta.ai/v1/responses");
    expect(seenBody["model"]).toBe("muse-image-1.0");
    expect(out.base64).toBe(MOCK_IMAGE_BASE64);
    expect(out.mime).toBe("image/png"); // 1x1 mock is a PNG
  });

  it("fails cleanly when no image item is present", async () => {
    const fetchFn = mockFetch(() => ({ status: "completed", output: [] }));
    await expect(callImageModel({ prompt: "x", fetchFn, config: TEST_CONFIG })).rejects.toMatchObject({
      code: "bad_output",
    });
  });

  it("throws not_configured without an API key", async () => {
    const fetchFn = mockFetch(() => ({}));
    await expect(
      callImageModel({ prompt: "x", fetchFn, config: { ...TEST_CONFIG, apiKey: null } }),
    ).rejects.toMatchObject({ code: "not_configured" });
  });
});

describe("helpers", () => {
  it("builds image prompts from location plus shared style", () => {
    const p = buildImagePrompt(
      { name: "Harbor", description: "Foggy docks.", imagePrompt: "foggy docks at dawn" },
      "neon-noir, teal shadows",
    );
    expect(p).toMatch(/foggy docks at dawn/);
    expect(p).toMatch(/neon-noir/);
    expect(p).toMatch(/Harbor/);
  });

  it("sniffs png, jpeg, and webp magic bytes", () => {
    expect(sniffImageMime(MOCK_IMAGE_BASE64)).toBe("image/png");
    expect(sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString("base64"))).toBe("image/jpeg");
    expect(
      sniffImageMime(Buffer.from("RIFF____WEBP", "ascii").toString("base64")),
    ).toBe("image/webp");
    expect(sniffImageMime("garbage!!")).toBe("image/webp");
  });

  it("scrubs credential material from error text", () => {
    expect(scrub("key LLM_12345_abcdef failed")).toBe("key LLM_[redacted] failed");
    expect(scrub("Authorization: Bearer abc123")).toBe("Authorization: Bearer [redacted]");
  });
});
