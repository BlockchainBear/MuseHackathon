import { NextResponse } from "next/server";
import { getProviderConfig, isLiveConfigured } from "@/lib/provider";

/** Public capability probe. Never exposes the key or its value. */
export async function GET() {
  const config = getProviderConfig();
  return NextResponse.json({
    configured: isLiveConfigured(),
    provider: "meta",
    textModel: config.textModel,
    imageModel: config.imageModel,
  });
}
