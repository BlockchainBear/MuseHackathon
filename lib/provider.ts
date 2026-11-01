/**
 * Server-side provider adapter for the Meta Model API.
 *
 * Verified against official docs (fetched 2026-11-01):
 * - https://dev.meta.ai/docs/models
 * - https://dev.meta.ai/docs/quickstart
 * - https://dev.meta.ai/docs/authentication
 * - https://dev.meta.ai/docs/structured-output
 * - https://dev.meta.ai/docs/image-generation
 *
 * Text:  POST {base}/chat/completions  (OpenAI-compatible, Bearer MODEL_API_KEY)
 *        with response_format { type: "json_schema", ... } for constrained JSON.
 * Image: POST {base}/responses with { model: muse-image-1.0, input }.
 *        The base64 image is in output[] item { type: "image_generation_call", result }.
 *
 * The API key is read from process.env on the server only and is never
 * returned to clients. Error messages are scrubbed of credential material.
 */

export const DEFAULT_TEXT_MODEL = "muse-spark-1.3";
export const DEFAULT_IMAGE_MODEL = "muse-image-1.0";
export const DEFAULT_API_BASE = "https://api.meta.ai/v1";

export const TEXT_TIMEOUT_MS = 120_000;
export const IMAGE_TIMEOUT_MS = 240_000;

export interface ProviderConfig {
  apiBase: string;
  textModel: string;
  imageModel: string;
  apiKey: string | null;
}

export function getProviderConfig(): ProviderConfig {
  return {
    apiBase: process.env.WORLDFORGE_API_BASE || DEFAULT_API_BASE,
    textModel: process.env.WORLDFORGE_TEXT_MODEL || DEFAULT_TEXT_MODEL,
    imageModel: process.env.WORLDFORGE_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
    apiKey: process.env.MODEL_API_KEY || null,
  };
}

export function isLiveConfigured(): boolean {
  return Boolean(process.env.MODEL_API_KEY);
}

export class ProviderError extends Error {
  code: string;
  status: number;
  retryable: boolean;
  constructor(code: string, message: string, status = 502, retryable = true) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

/** Remove anything that could carry credential material from error text. */
export function scrub(text: string): string {
  return text
    .replace(/LLM_[A-Za-z0-9_.-]+/g, "LLM_[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9_.\-|]+/gi, "Bearer [redacted]");
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ProviderError("timeout", "The model request timed out. Try again.", 504, true);
    }
    throw new ProviderError(
      "network",
      "Could not reach the model API. Check your connection and try again.",
      502,
      true,
    );
  } finally {
    clearTimeout(t);
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return scrub(text).slice(0, 500);
  } catch {
    return "";
  }
}

function throwForStatus(res: Response, detail: string): never {
  if (res.status === 401 || res.status === 403) {
    throw new ProviderError(
      "auth",
      "The API key was rejected. Check MODEL_API_KEY in your private .env.local and try again.",
      res.status,
      false,
    );
  }
  if (res.status === 429) {
    throw new ProviderError(
      "rate_limited",
      "The model API rate-limited this request. Wait a bit and try again.",
      429,
      true,
    );
  }
  if (res.status === 400) {
    throw new ProviderError(
      "bad_request",
      `The model API rejected the request.${detail ? ` (${detail})` : ""}`,
      400,
      false,
    );
  }
  throw new ProviderError(
    "provider",
    `The model API returned an error (HTTP ${res.status}). Try again shortly.`,
    502,
    true,
  );
}

/** JSON Schema (non-recursive) for constrained world generation. */
export const WORLD_CONTENT_JSON_SCHEMA = {
  name: "WorldForgeWorld",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "name", "logline", "overview", "visualDirection", "locations", "npcs",
      "mainQuest", "sideQuests", "assets", "blenderPrompt", "unrealPrompt", "connections",
    ],
    properties: {
      name: { type: "string", minLength: 1, maxLength: 100 },
      logline: { type: "string", minLength: 1, maxLength: 400 },
      overview: { type: "string", minLength: 1, maxLength: 3000 },
      visualDirection: { type: "string", minLength: 1, maxLength: 2000 },
      locations: {
        type: "array", minItems: 5, maxItems: 5,
        items: {
          type: "object", additionalProperties: false,
          required: ["id", "name", "description", "category", "keyProps", "imagePrompt"],
          properties: {
            id: { type: "string", enum: ["loc-1", "loc-2", "loc-3", "loc-4", "loc-5"] },
            name: { type: "string", minLength: 1, maxLength: 80 },
            description: { type: "string", minLength: 1, maxLength: 1200 },
            category: { type: "string", minLength: 1, maxLength: 60 },
            keyProps: { type: "array", minItems: 1, maxItems: 10, items: { type: "string", minLength: 1, maxLength: 120 } },
            imagePrompt: { type: "string", minLength: 1, maxLength: 1500 },
          },
        },
      },
      npcs: {
        type: "array", minItems: 3, maxItems: 3,
        items: {
          type: "object", additionalProperties: false,
          required: ["id", "name", "role", "personality", "dialogue", "locationId"],
          properties: {
            id: { type: "string", enum: ["npc-1", "npc-2", "npc-3"] },
            name: { type: "string", minLength: 1, maxLength: 80 },
            role: { type: "string", minLength: 1, maxLength: 120 },
            personality: { type: "string", minLength: 1, maxLength: 600 },
            dialogue: { type: "string", minLength: 1, maxLength: 800 },
            locationId: { type: "string", enum: ["loc-1", "loc-2", "loc-3", "loc-4", "loc-5"] },
          },
        },
      },
      mainQuest: {
        type: "object", additionalProperties: false,
        required: ["id", "title", "goal", "steps", "locationIds"],
        properties: {
          id: { type: "string", enum: ["quest-main"] },
          title: { type: "string", minLength: 1, maxLength: 120 },
          goal: { type: "string", minLength: 1, maxLength: 600 },
          steps: { type: "array", minItems: 2, maxItems: 12, items: { type: "string", minLength: 1, maxLength: 300 } },
          locationIds: {
            type: "array", minItems: 1, maxItems: 5,
            items: { type: "string", enum: ["loc-1", "loc-2", "loc-3", "loc-4", "loc-5"] },
          },
        },
      },
      sideQuests: {
        type: "array", minItems: 3, maxItems: 3,
        items: {
          type: "object", additionalProperties: false,
          required: ["id", "title", "goal", "locationId"],
          properties: {
            id: { type: "string" },
            title: { type: "string", minLength: 1, maxLength: 120 },
            goal: { type: "string", minLength: 1, maxLength: 600 },
            locationId: { type: "string", enum: ["loc-1", "loc-2", "loc-3", "loc-4", "loc-5"] },
          },
        },
      },
      assets: {
        type: "object", additionalProperties: false,
        required: ["categories"],
        properties: {
          categories: {
            type: "array", minItems: 1, maxItems: 10,
            items: {
              type: "object", additionalProperties: false,
              required: ["name", "items"],
              properties: {
                name: { type: "string", minLength: 1, maxLength: 80 },
                items: { type: "array", minItems: 1, maxItems: 24, items: { type: "string", minLength: 1, maxLength: 160 } },
              },
            },
          },
        },
      },
      blenderPrompt: { type: "string", minLength: 1, maxLength: 2500 },
      unrealPrompt: { type: "string", minLength: 1, maxLength: 2500 },
      connections: {
        type: "array", maxItems: 12,
        items: {
          type: "object", additionalProperties: false,
          required: ["from", "to"],
          properties: {
            from: { type: "string", enum: ["loc-1", "loc-2", "loc-3", "loc-4", "loc-5"] },
            to: { type: "string", enum: ["loc-1", "loc-2", "loc-3", "loc-4", "loc-5"] },
          },
        },
      },
    },
  },
} as const;

export const REMIX_JSON_SCHEMA = {
  name: "WorldForgeLocationRemix",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["name", "description", "category", "keyProps", "imagePrompt"],
    properties: {
      name: { type: "string", minLength: 1, maxLength: 80 },
      description: { type: "string", minLength: 1, maxLength: 1200 },
      category: { type: "string", minLength: 1, maxLength: 60 },
      keyProps: { type: "array", minItems: 1, maxItems: 10, items: { type: "string", minLength: 1, maxLength: 120 } },
      imagePrompt: { type: "string", minLength: 1, maxLength: 1500 },
    },
  },
} as const;

export const WORLD_SYSTEM_PROMPT =
  "You are WorldForge, a game-world concept planner. You design world bibles for video-game pre-production: " +
  "never a playable game, only planning material. Output must follow the required JSON schema exactly. " +
  "Use stable IDs exactly as specified (loc-1..loc-5, npc-1..npc-3, quest-main). " +
  "Side quest IDs must be quest-side-1, quest-side-2, quest-side-3 in order. " +
  "All locationId references must point at one of loc-1..loc-5. " +
  "Connections must link different locations with no duplicates. " +
  "Write vivid, specific, production-useful content. No markdown, no commentary outside the JSON.";

export function worldUserPrompt(idea: string, genre: string, tone: string): string {
  return (
    `Create a complete game-world bible as JSON.\n` +
    `Idea: ${idea}\nGenre: ${genre}\nTone: ${tone}\n\n` +
    `Requirements: exactly 5 locations (ids loc-1..loc-5, each with key props and a concept-art image prompt), ` +
    `exactly 3 NPCs (ids npc-1..npc-3, each with personality, one dialogue line, and a valid locationId), ` +
    `one main quest (id quest-main, ordered steps, referenced locationIds), exactly 3 side quests ` +
    `(ids quest-side-1..3, each with a valid locationId), a categorized asset checklist, ` +
    `a Blender production prompt, an Unreal pre-production planning prompt (reference only, not playable levels), ` +
    `and map connections between locations.`
  );
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
}

function extractJsonContent(body: unknown): string {
  const c = (body as ChatCompletionResponse)?.choices?.[0]?.message?.content;
  if (typeof c !== "string" || c.length === 0) {
    throw new ProviderError("bad_output", "The model returned an empty response. Try again.", 502, true);
  }
  return c;
}

export interface TextCallParams {
  system: string;
  user: string;
  schema: { name: string; schema: unknown };
  maxTokens?: number;
  /** Dependency-injected fetch for tests. */
  fetchFn?: typeof fetch;
  config?: ProviderConfig;
  timeoutMs?: number;
}

/** One Chat Completions call with constrained JSON output. Returns parsed JSON. */
export async function callTextModel(params: TextCallParams): Promise<unknown> {
  const config = params.config ?? getProviderConfig();
  if (!config.apiKey) {
    throw new ProviderError(
      "not_configured",
      "No API key is configured. Add MODEL_API_KEY to your private .env.local, or use the sample demo.",
      503,
      false,
    );
  }
  const doFetch = params.fetchFn ?? fetchWithTimeout;
  const res =
    params.fetchFn != null
      ? await params.fetchFn(`${config.apiBase}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.textModel,
            messages: [
              { role: "system", content: params.system },
              { role: "user", content: params.user },
            ],
            response_format: { type: "json_schema", json_schema: params.schema },
            max_tokens: params.maxTokens ?? 8000,
          }),
        })
      : await doFetch(`${config.apiBase}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.textModel,
            messages: [
              { role: "system", content: params.system },
              { role: "user", content: params.user },
            ],
            response_format: { type: "json_schema", json_schema: params.schema },
            max_tokens: params.maxTokens ?? 8000,
          }),
        }, params.timeoutMs ?? TEXT_TIMEOUT_MS);

  if (!res.ok) throwForStatus(res, await readError(res));
  const raw = await res.text();
  if (raw.length > 500_000) {
    throw new ProviderError("bad_output", "The model response was unexpectedly large. Try again.", 502, true);
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new ProviderError("bad_output", "The model returned an unreadable response. Try again.", 502, true);
  }
  const content = extractJsonContent(body);
  try {
    return JSON.parse(content);
  } catch {
    throw new ProviderError(
      "bad_output",
      "The model returned malformed world data. Try generating again.",
      502,
      true,
    );
  }
}

interface ResponsesApiOutputItem {
  type?: string;
  result?: string;
  status?: string;
}
interface ResponsesApiBody {
  status?: string;
  output?: ResponsesApiOutputItem[];
}

export interface ImageCallParams {
  prompt: string;
  fetchFn?: typeof fetch;
  config?: ProviderConfig;
  timeoutMs?: number;
}

export interface GeneratedImage {
  mime: string;
  base64: string;
}

/** One Muse Image call via the Responses API. Returns base64 image bytes. */
export async function callImageModel(params: ImageCallParams): Promise<GeneratedImage> {
  const config = params.config ?? getProviderConfig();
  if (!config.apiKey) {
    throw new ProviderError(
      "not_configured",
      "No API key is configured. Add MODEL_API_KEY to your private .env.local to generate concept art.",
      503,
      false,
    );
  }
  const res =
    params.fetchFn != null
      ? await params.fetchFn(`${config.apiBase}/responses`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model: config.imageModel, input: params.prompt }),
        })
      : await fetchWithTimeout(
          `${config.apiBase}/responses`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ model: config.imageModel, input: params.prompt }),
          },
          params.timeoutMs ?? IMAGE_TIMEOUT_MS,
        );

  if (!res.ok) throwForStatus(res, await readError(res));
  let body: ResponsesApiBody;
  try {
    body = (await res.json()) as ResponsesApiBody;
  } catch {
    throw new ProviderError("bad_output", "The image model returned an unreadable response.", 502, true);
  }
  const item = body.output?.find((o) => o?.type === "image_generation_call" && typeof o.result === "string");
  if (!item?.result) {
    throw new ProviderError(
      "bad_output",
      "The image model returned no image. Try again.",
      502,
      true,
    );
  }
  if (item.result.length > 30_000_000) {
    throw new ProviderError("bad_output", "The generated image was unexpectedly large.", 502, true);
  }
  return { mime: sniffImageMime(item.result), base64: item.result };
}

/** Detect PNG/JPEG/WebP from base64 magic bytes; default to webp per docs example. */
export function sniffImageMime(b64: string): string {
  try {
    const bin = Buffer.from(b64.slice(0, 32), "base64");
    if (bin.length >= 4 && bin[0] === 0x89 && bin[1] === 0x50 && bin[2] === 0x4e && bin[3] === 0x47) {
      return "image/png";
    }
    if (bin.length >= 3 && bin[0] === 0xff && bin[1] === 0xd8 && bin[2] === 0xff) return "image/jpeg";
    if (bin.length >= 12 && bin.toString("ascii", 0, 4) === "RIFF" && bin.toString("ascii", 8, 12) === "WEBP") {
      return "image/webp";
    }
  } catch {
    /* fall through */
  }
  return "image/webp";
}

/** Build a consistent concept-art prompt from location + shared visual direction. */
export function buildImagePrompt(
  location: { name: string; description: string; imagePrompt: string },
  visualDirection: string,
): string {
  return (
    `Video-game location concept art (2D illustration, not a 3D asset): ${location.imagePrompt.trim()} ` +
    `Location: ${location.name} — ${location.description.trim()} ` +
    `Shared world style: ${visualDirection.trim()} ` +
    `No text, no watermark, no UI.`
  ).slice(0, 4000);
}

/* ------------------------------------------------------------------ */
/* Mock provider for development tests. Never used for live UI calls.  */
/* ------------------------------------------------------------------ */

/** 1×1 transparent PNG. */
export const MOCK_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export function mockFetch(fill: (url: string, init: RequestInit) => unknown): typeof fetch {
  return (async (url: unknown, init?: RequestInit) => {
    const payload = fill(String(url), init ?? {});
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
}

export function mockChatResponse(content: unknown): unknown {
  return { choices: [{ message: { content: JSON.stringify(content) } }] };
}

export function mockImageResponse(base64 = MOCK_IMAGE_BASE64): unknown {
  return {
    id: "resp_mock",
    status: "completed",
    output: [
      { type: "message", id: "msg_mock", role: "assistant", content: [], status: "completed" },
      { type: "image_generation_call", id: "ig_mock", status: "completed", result: base64 },
    ],
  };
}
