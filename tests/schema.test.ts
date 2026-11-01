import { describe, expect, it } from "vitest";
import {
  WorldDocSchema,
  WorldSchema,
  positionsFor,
} from "../lib/schema";
import { SAMPLE_WORLD, makeSampleDoc, mockGeneratedContent } from "../lib/sample";

describe("sample world", () => {
  it("validates against the full schema", () => {
    expect(WorldSchema.safeParse(SAMPLE_WORLD).success).toBe(true);
    expect(WorldDocSchema.safeParse(makeSampleDoc()).success).toBe(true);
  });

  it("has exactly 5 locations, 3 NPCs, 1 main + 3 side quests", () => {
    expect(SAMPLE_WORLD.locations).toHaveLength(5);
    expect(SAMPLE_WORLD.npcs).toHaveLength(3);
    expect(SAMPLE_WORLD.sideQuests).toHaveLength(3);
    expect(SAMPLE_WORLD.mainQuest.steps.length).toBeGreaterThanOrEqual(2);
  });
});

describe("world validation", () => {
  it("rejects wrong location counts", () => {
    const bad = structuredClone(SAMPLE_WORLD);
    bad.locations = bad.locations.slice(0, 4);
    expect(WorldSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects duplicate location IDs", () => {
    const bad = structuredClone(SAMPLE_WORLD);
    bad.locations[1].id = bad.locations[0].id;
    const res = WorldSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects NPC references to unknown locations", () => {
    const bad = structuredClone(SAMPLE_WORLD);
    bad.npcs[0].locationId = "loc-999";
    const res = WorldSchema.safeParse(bad);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toMatch(/unknown location/);
    }
  });

  it("rejects side quests pointing at unknown locations", () => {
    const bad = structuredClone(SAMPLE_WORLD);
    bad.sideQuests[2].locationId = "nope";
    expect(WorldSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects self connections", () => {
    const bad = structuredClone(SAMPLE_WORLD);
    bad.connections = [{ from: "loc-1", to: "loc-1" }];
    const res = WorldSchema.safeParse(bad);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toMatch(/itself/);
    }
  });

  it("rejects duplicate connections (either direction)", () => {
    const bad = structuredClone(SAMPLE_WORLD);
    bad.connections = [
      { from: "loc-1", to: "loc-2" },
      { from: "loc-2", to: "loc-1" },
    ];
    expect(WorldSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects connections to unknown locations", () => {
    const bad = structuredClone(SAMPLE_WORLD);
    bad.connections = [{ from: "loc-1", to: "loc-77" }];
    expect(WorldSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects overlong strings", () => {
    const bad = structuredClone(SAMPLE_WORLD);
    bad.name = "x".repeat(500);
    expect(WorldSchema.safeParse(bad).success).toBe(false);
  });
});

describe("doc validation", () => {
  it("rejects docs missing a map position", () => {
    const doc = makeSampleDoc();
    delete doc.positions["loc-3"];
    const res = WorldDocSchema.safeParse(doc);
    expect(res.success).toBe(false);
  });

  it("rejects out-of-bounds positions", () => {
    const doc = makeSampleDoc();
    doc.positions["loc-1"] = { x: 5000, y: 10 };
    expect(WorldDocSchema.safeParse(doc).success).toBe(false);
  });

  it("assigns fixed layout positions", () => {
    const pos = positionsFor(["a", "b", "c", "d", "e"]);
    expect(Object.keys(pos)).toHaveLength(5);
    for (const p of Object.values(pos)) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1000);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(700);
    }
  });
});

describe("mock generated content", () => {
  it("produces structurally valid world content", () => {
    const content = mockGeneratedContent("test idea", "Fantasy", "Dark");
    const { _meta, ...rest } = content as Record<string, unknown>;
    expect(_meta).toBeDefined();
    const world = {
      schemaVersion: 1,
      id: "world-test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      idea: "test idea",
      genre: "Fantasy",
      tone: "Dark",
      ...rest,
    };
    expect(WorldSchema.safeParse(world).success).toBe(true);
  });
});
