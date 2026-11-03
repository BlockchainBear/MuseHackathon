import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { SAMPLE_ART } from "../lib/sample";

const PUBLIC = join(process.cwd(), "public");

function expectArt(path: string, minBytes: number) {
  const full = join(PUBLIC, path);
  expect(existsSync(full), `missing ${path}`).toBe(true);
  expect(statSync(full).size).toBeGreaterThan(minBytes);
}

describe("bundled artwork", () => {
  it("ships hero and backdrop art", () => {
    expectArt("art/hero.jpg", 50_000);
    expectArt("art/backdrop.jpg", 20_000);
  });

  it("ships one sample image per location", () => {
    expect(Object.keys(SAMPLE_ART)).toHaveLength(5);
    for (const [locId, path] of Object.entries(SAMPLE_ART)) {
      expect(path, locId).toMatch(/^\/art\/sample\/loc-\d\.jpg$/);
      expectArt(path.slice(1), 50_000);
    }
  });
});
