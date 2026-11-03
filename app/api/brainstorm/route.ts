import { NextResponse } from "next/server";
import { z } from "zod";
import { formatZodError } from "@/lib/schema";
import { BRAINSTORM_SYSTEM_PROMPT, ProviderError, callChatText } from "@/lib/provider";

const MsgSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
});

const RequestSchema = z.object({
  messages: z.array(MsgSchema).min(1).max(20),
});

/** POST /api/brainstorm — plain-text brainstorm chat turn. */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      const text = await req.text();
      if (text.length > 32_768) {
        return NextResponse.json(
          { error: "Conversation is too long. Start a fresh brainstorm.", code: "too_large", retryable: false },
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
    const total = parsed.data.messages.reduce((n, m) => n + m.content.length, 0);
    if (total > 12_000) {
      return NextResponse.json(
        { error: "Conversation is too long. Start a fresh brainstorm.", code: "too_large", retryable: false },
        { status: 413 },
      );
    }

    const reply = await callChatText({
      system: BRAINSTORM_SYSTEM_PROMPT,
      messages: parsed.data.messages,
      maxTokens: 600,
      timeoutMs: 60_000,
    });
    return NextResponse.json({ reply });
  } catch (err) {
    if (err instanceof ProviderError) {
      return NextResponse.json(
        { error: err.message, code: err.code, retryable: err.retryable },
        { status: err.status },
      );
    }
    console.error("brainstorm failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Brainstorm failed unexpectedly. Try again.", code: "internal", retryable: true },
      { status: 500 },
    );
  }
}
