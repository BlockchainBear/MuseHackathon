import { NextResponse } from "next/server";
import { z } from "zod";
import {
  WorldObjectSchema,
  WorldSchema,
  formatZodError,
  type World,
} from "@/lib/schema";
import {
  ProviderError,
  WORLD_SYSTEM_PROMPT,
  WORLD_CONTENT_JSON_SCHEMA,
  callTextModel,
  worldUserPrompt,
} from "@/lib/provider";

const RequestSchema = z.object({
  idea: z.string().trim().min(4).max(2000),
  genre: z.string().trim().min(1).max(60).default("Unspecified"),
  tone: z.string().trim().min(1).max(60).default("Unspecified"),
});

const ContentSchema = WorldObjectSchema.omit({
  schemaVersion: true,
  id: true,
  createdAt: true,
  updatedAt: true,
  idea: true,
  genre: true,
  tone: true,
});

function newWorldId(): string {
  return `world-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function errorResponse(err: unknown): NextResponse {
  if (err instanceof ProviderError) {
    return NextResponse.json(
      { error: err.message, code: err.code, retryable: err.retryable },
      { status: err.status },
    );
  }
  console.error("generate-world failed:", err instanceof Error ? err.message : err);
  return NextResponse.json(
    { error: "World generation failed unexpectedly. Try again.", code: "internal", retryable: true },
    { status: 500 },
  );
}

/**
 * POST /api/generate-world — one text-model request for structured world JSON.
 * Validates model output with Zod; never substitutes sample data on failure.
 */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      const text = await req.text();
      if (text.length > 16_384) {
        return NextResponse.json(
          { error: "Request is too large.", code: "too_large", retryable: false },
          { status: 413 },
        );
      }
      body = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON.", code: "bad_json", retryable: false },
        { status: 400 },
      );
    }

    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error), code: "invalid_request", retryable: false },
        { status: 400 },
      );
    }
    const { idea, genre, tone } = parsed.data;

    const content = await callTextModel({
      system: WORLD_SYSTEM_PROMPT,
      user: worldUserPrompt(idea, genre, tone),
      schema: WORLD_CONTENT_JSON_SCHEMA,
      maxTokens: 8000,
    });

    const contentParsed = ContentSchema.safeParse(content);
    if (!contentParsed.success) {
      return NextResponse.json(
        {
          error: `The model returned invalid world data (${formatZodError(contentParsed.error)}). Retry generation — your existing work is untouched.`,
          code: "invalid_model_output",
          retryable: true,
        },
        { status: 502 },
      );
    }

    const now = new Date().toISOString();
    const world: World = {
      schemaVersion: 1,
      id: newWorldId(),
      createdAt: now,
      updatedAt: now,
      idea,
      genre,
      tone,
      ...contentParsed.data,
    };

    // Final full-document validation (IDs, references, connections).
    const full = WorldSchema.safeParse(world);
    if (!full.success) {
      return NextResponse.json(
        {
          error: `The model returned inconsistent world data (${formatZodError(full.error)}). Retry generation — your existing work is untouched.`,
          code: "invalid_model_output",
          retryable: true,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ world: full.data });
  } catch (err) {
    return errorResponse(err);
  }
}
