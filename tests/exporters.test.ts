import { describe, expect, it } from "vitest";
import {
  buildKitReadme,
  buildMapSvg,
  buildWorldBibleMd,
  buildWorldJson,
  slugify,
} from "../lib/exporters";
import { SCHEMA_VERSION } from "../lib/schema";
import { makeSampleDoc } from "../lib/sample";

describe("exporters", () => {
  it("builds JSON with schema version and no-binary note", () => {
    const json = buildWorldJson(makeSampleDoc());
    const parsed = JSON.parse(json) as { schemaVersion: number; note: string; doc: unknown };
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.note).toMatch(/no binary image data/);
    expect(parsed.doc).toBeDefined();
  });

  it("builds a standalone SVG with embedded styles", () => {
    const svg = buildMapSvg(makeSampleDoc());
    expect(svg).toMatch(/<svg xmlns=/);
    expect(svg).toMatch(/<style>/);
    expect(svg).toMatch(/Neon Night Market/);
    expect(svg).toMatch(/Market Entrance/);
  });

  it("escapes user content in SVG (no executable markup)", () => {
    const doc = makeSampleDoc();
    doc.world.locations[0].name = '<script>alert("xss")</script>';
    doc.world.name = '"><img src=x onerror=alert(1)>';
    const svg = buildMapSvg(doc);
    expect(svg).not.toMatch(/<script>/);
    expect(svg).not.toMatch(/<img src=x/);
    expect(svg).toMatch(/&lt;script&gt;/);
    expect(svg).toMatch(/&quot;&gt;&lt;img/);
  });

  it("builds a complete markdown bible", () => {
    const md = buildWorldBibleMd(makeSampleDoc());
    for (const section of [
      "# Neon Night Market",
      "## Locations",
      "## NPCs",
      "## Main Quest",
      "## Side Quests",
      "## Asset Checklist",
      "## Production Prompts",
      "Mama Noi",
      "The Midnight Circuit",
    ]) {
      expect(md).toContain(section);
    }
  });

  it("builds a kit readme listing contents", () => {
    const readme = buildKitReadme(makeSampleDoc());
    expect(readme).toMatch(/world\.json/);
    expect(readme).toMatch(/map\.svg/);
    expect(readme).toMatch(/world-bible\.md/);
    expect(readme).toMatch(/images\//);
  });

  it("slugifies filenames safely", () => {
    expect(slugify("Neon Night Market!")).toBe("neon-night-market");
    expect(slugify("  ")).toBe("world");
  });
});
