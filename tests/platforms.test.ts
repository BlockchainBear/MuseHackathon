import { describe, expect, it } from "vitest";
import { WorldDocSchema } from "../lib/schema";
import { PLATFORM_META, buildPlatformPack, buildPlatformsMd } from "../lib/platforms";
import { makeSampleDoc } from "../lib/sample";

describe("platform packs", () => {
  it("builds a pack per platform referencing real world content", () => {
    const doc = makeSampleDoc();
    for (const p of ["horizon", "roblox", "fortnite"] as const) {
      const pack = buildPlatformPack(doc, p);
      expect(pack.prompt).toContain("Neon Night Market");
      expect(pack.prompt).toContain("Market Entrance");
      expect(pack.checklist.length).toBeGreaterThan(10);
      expect(pack.script).toContain("loc-1");
      expect(pack.scriptLanguage).toBe(PLATFORM_META[p].language);
    }
  });

  it("uses the right starter language per platform", () => {
    const doc = makeSampleDoc();
    expect(buildPlatformPack(doc, "horizon").script).toContain("horizon/core");
    expect(buildPlatformPack(doc, "roblox").script).toContain("ProximityPrompt");
    expect(buildPlatformPack(doc, "fortnite").script).toContain("creative_device");
  });

  it("builds a combined markdown doc with code blocks", () => {
    const md = buildPlatformsMd(makeSampleDoc());
    expect(md).toContain("Horizon Worlds");
    expect(md).toContain("Roblox");
    expect(md).toContain("UEFN");
    expect(md).toContain("```");
    expect(md).toMatch(/not playable level exports/);
  });

  it("defaults old docs without platforms to all three", () => {
    const doc = makeSampleDoc() as unknown as Record<string, unknown>;
    delete doc.platforms;
    const parsed = WorldDocSchema.safeParse(doc);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.platforms).toEqual(["horizon", "roblox", "fortnite"]);
    }
  });

  it("rejects empty platform lists", () => {
    const doc = makeSampleDoc();
    doc.platforms = [];
    expect(WorldDocSchema.safeParse(doc).success).toBe(false);
  });
});
