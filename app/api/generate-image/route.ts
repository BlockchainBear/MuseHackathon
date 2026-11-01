import { NextResponse } from "next/server";
import { z } from "zod";
import { WorldSchema, formatZodError } from "@/lib/schema";
import { ProviderError, buildImagePrompt, callImageModel } from "@/lib/provider";

const RequestSchema = z.object({
  world: WorldSchema,
  locationId: z.string().min(1).max(48),
});

/** POST /api/generate-image — one location's concept art. */
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
    const { world, locationId } = parsed.data;
    const location = world.locations.find((l) => l.id === locationId);
    if (!location) {
      return NextResponse.json(
        { error: "Unknown location ID.", code: "unknown_location", retryable: false },
        { status: 400 },
      );
    }

    const prompt = buildImagePrompt(location, world.visualDirection);
    const image = await callImageModel({ prompt });
    return NextResponse.json({ mime: image.mime, base64: image.base64, locationId });
  } catch (err) {
    if (err instanceof ProviderError) {
      return NextResponse.json(
        { error: err.message, code: err.code, retryable: err.retryable },
        { status: err.status },
      );
    }
    console.error("generate-image failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Image generation failed unexpectedly. The world is untouched.", code: "internal", retryable: true },
      { status: 500 },
    );
  }
}
