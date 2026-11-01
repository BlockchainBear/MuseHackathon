import { NextResponse } from "next/server";
import { z } from "zod";
import { LocationSchema, WorldSchema, formatZodError } from "@/lib/schema";
import {
  ProviderError,
  REMIX_JSON_SCHEMA,
  callTextModel,
} from "@/lib/provider";

const RequestSchema = z.object({
  world: WorldSchema,
  locationId: z.string().min(1).max(48),
  instruction: z.string().trim().min(4).max(1000),
});

const RemixContentSchema = LocationSchema.omit({ id: true });

/** POST /api/remix-location — rewrite one location's creative fields only. */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      const text = await req.text();
      if (text.length > 200_000) {
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
    const { world, locationId, instruction } = parsed.data;
    const location = world.locations.find((l) => l.id === locationId);
    if (!location) {
      return NextResponse.json(
        { error: "Unknown location ID.", code: "unknown_location", retryable: false },
        { status: 400 },
      );
    }

    const content = await callTextModel({
      system:
        "You are WorldForge, a game-world concept planner. Rewrite exactly one location's creative fields " +
        "(name, description, category, keyProps, imagePrompt) following the user's instruction. " +
        "Stay consistent with the world's genre, tone, and visual direction. Output must follow the required JSON schema exactly.",
      user:
        `World: ${world.name} (${world.genre}, ${world.tone}).\n` +
        `Visual direction: ${world.visualDirection}\n` +
        `Current location: ${JSON.stringify(location)}\n` +
        `Instruction: ${instruction}\n\n` +
        `Return the updated creative fields as JSON.`,
      schema: REMIX_JSON_SCHEMA,
      maxTokens: 2000,
    });

    const remixParsed = RemixContentSchema.safeParse(content);
    if (!remixParsed.success) {
      return NextResponse.json(
        {
          error: `The model returned invalid location data (${formatZodError(remixParsed.error)}). Your existing work is untouched.`,
          code: "invalid_model_output",
          retryable: true,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ location: { id: locationId, ...remixParsed.data } });
  } catch (err) {
    if (err instanceof ProviderError) {
      return NextResponse.json(
        { error: err.message, code: err.code, retryable: err.retryable },
        { status: err.status },
      );
    }
    console.error("remix-location failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Remix failed unexpectedly. Try again.", code: "internal", retryable: true },
      { status: 500 },
    );
  }
}
