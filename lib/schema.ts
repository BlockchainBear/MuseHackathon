import { z } from "zod";

/** Current on-disk / export schema version. Bump on breaking changes. */
export const SCHEMA_VERSION = 1;

const idShape = z
  .string()
  .trim()
  .min(1)
  .max(48)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "IDs must be lowercase slugs");

const short = (max: number) => z.string().trim().min(1).max(max);
const ref = z.string().trim().min(1).max(48);

export const LocationSchema = z.object({
  id: idShape,
  name: short(80),
  description: z.string().trim().min(1).max(1200),
  category: short(60),
  keyProps: z.array(short(120)).min(1).max(10),
  imagePrompt: z.string().trim().min(1).max(1500),
});

export const NpcSchema = z.object({
  id: idShape,
  name: short(80),
  role: short(120),
  personality: z.string().trim().min(1).max(600),
  dialogue: z.string().trim().min(1).max(800),
  locationId: ref,
});

export const MainQuestSchema = z.object({
  id: idShape,
  title: short(120),
  goal: z.string().trim().min(1).max(600),
  steps: z.array(short(300)).min(2).max(12),
  locationIds: z.array(ref).min(1).max(5),
});

export const SideQuestSchema = z.object({
  id: idShape,
  title: short(120),
  goal: z.string().trim().min(1).max(600),
  locationId: ref,
});

export const AssetCategorySchema = z.object({
  name: short(80),
  items: z.array(short(160)).min(1).max(24),
});

export const ConnectionSchema = z.object({
  from: ref,
  to: ref,
});

export const WorldObjectSchema = z.object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    id: idShape,
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    idea: z.string().trim().min(1).max(2000),
    genre: short(60),
    tone: short(60),
    name: short(100),
    logline: z.string().trim().min(1).max(400),
    overview: z.string().trim().min(1).max(3000),
    visualDirection: z.string().trim().min(1).max(2000),
    locations: z.array(LocationSchema).length(5),
    npcs: z.array(NpcSchema).length(3),
    mainQuest: MainQuestSchema,
    sideQuests: z.array(SideQuestSchema).length(3),
    assets: z.object({
      categories: z.array(AssetCategorySchema).min(1).max(10),
    }),
    blenderPrompt: z.string().trim().min(1).max(2500),
    unrealPrompt: z.string().trim().min(1).max(2500),
    connections: z.array(ConnectionSchema).max(12),
  });

export const WorldSchema = WorldObjectSchema.superRefine(
  (w: z.infer<typeof WorldObjectSchema>, ctx: z.RefinementCtx) => {
    const fail = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

    const locIds = w.locations.map((l) => l.id);
    const locSet = new Set(locIds);
    if (locSet.size !== locIds.length) fail(["locations"], "Location IDs must be unique.");

    const npcIds = w.npcs.map((n) => n.id);
    if (new Set(npcIds).size !== npcIds.length) fail(["npcs"], "NPC IDs must be unique.");

    const sqIds = w.sideQuests.map((q) => q.id);
    if (new Set(sqIds).size !== sqIds.length) fail(["sideQuests"], "Side quest IDs must be unique.");

    w.npcs.forEach((n, i) => {
      if (!locSet.has(n.locationId)) {
        fail(["npcs", i, "locationId"], `NPC "${n.name}" references unknown location "${n.locationId}".`);
      }
    });

    const mainLoc = new Set(w.mainQuest.locationIds);
    if (mainLoc.size !== w.mainQuest.locationIds.length) {
      fail(["mainQuest", "locationIds"], "Main quest location IDs must be unique.");
    }
    w.mainQuest.locationIds.forEach((id) => {
      if (!locSet.has(id)) fail(["mainQuest", "locationIds"], `Main quest references unknown location "${id}".`);
    });

    w.sideQuests.forEach((q, i) => {
      if (!locSet.has(q.locationId)) {
        fail(["sideQuests", i, "locationId"], `Side quest "${q.title}" references unknown location "${q.locationId}".`);
      }
    });

    const seenPairs = new Set<string>();
    w.connections.forEach((c, i) => {
      if (!locSet.has(c.from) || !locSet.has(c.to)) {
        fail(["connections", i], `Connection references unknown location ("${c.from}" → "${c.to}").`);
        return;
      }
      if (c.from === c.to) {
        fail(["connections", i], "Connection cannot link a location to itself.");
        return;
      }
      const key = [c.from, c.to].sort().join("|");
      if (seenPairs.has(key)) {
        fail(["connections", i], "Duplicate connection.");
        return;
      }
      seenPairs.add(key);
    });
  });

export type World = z.infer<typeof WorldSchema>;
export type WorldLocation = z.infer<typeof LocationSchema>;
export type Npc = z.infer<typeof NpcSchema>;
export type MainQuest = z.infer<typeof MainQuestSchema>;
export type SideQuest = z.infer<typeof SideQuestSchema>;
export type WorldConnection = z.infer<typeof ConnectionSchema>;

/** Map canvas is a fixed 1000 × 700 coordinate system. */
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 700;

export const MapPosSchema = z.object({
  x: z.number().min(0).max(MAP_WIDTH),
  y: z.number().min(0).max(MAP_HEIGHT),
});
export type MapPos = z.infer<typeof MapPosSchema>;

export const ImageStatusSchema = z.enum(["none", "pending", "ready", "outdated", "failed"]);
export type ImageStatus = z.infer<typeof ImageStatusSchema>;

export const PlatformSchema = z.enum(["horizon", "roblox", "fortnite"]);
export type Platform = z.infer<typeof PlatformSchema>;
export const ALL_PLATFORMS: Platform[] = ["horizon", "roblox", "fortnite"];

export const ImageMetaSchema = z.object({
  status: ImageStatusSchema,
  updatedAt: z.string().datetime({ offset: true }).optional(),
  error: z.string().max(300).optional(),
  bundled: z.boolean().optional(),
});
export type ImageMeta = z.infer<typeof ImageMetaSchema>;

/**
 * A saved/open document: validated world content plus local-only state
 * (map positions, per-image status). Image blobs live in a separate
 * IndexedDB store and are never embedded in the JSON.
 */
export const WorldDocSchema = z
  .object({
    world: WorldSchema,
    positions: z.record(MapPosSchema),
    imageState: z.record(ImageMetaSchema),
    source: z.enum(["live", "sample", "imported"]),
    platforms: z.array(PlatformSchema).min(1).max(3).optional().default(["horizon", "roblox", "fortnite"]),
  })
  .superRefine((doc, ctx) => {
    for (const loc of doc.world.locations) {
      if (!doc.positions[loc.id]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["positions", loc.id],
          message: `Missing map position for location "${loc.id}".`,
        });
      }
    }
  });

export type WorldDoc = z.infer<typeof WorldDocSchema>;

/** Fixed initial layout for the five locations (1000 × 700 canvas). */
export const FIXED_LAYOUT: MapPos[] = [
  { x: 180, y: 210 },
  { x: 500, y: 130 },
  { x: 820, y: 220 },
  { x: 330, y: 510 },
  { x: 690, y: 520 },
];

export function positionsFor(locIds: string[]): Record<string, MapPos> {
  const out: Record<string, MapPos> = {};
  locIds.forEach((id, i) => {
    out[id] = { ...FIXED_LAYOUT[i % FIXED_LAYOUT.length] };
  });
  return out;
}

/** Human-readable summary of a Zod failure for UI display. */
export function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  if (!first) return "Invalid data.";
  const path = first.path.length > 0 ? ` (${first.path.join(".")})` : "";
  const extra = err.issues.length > 1 ? ` (+${err.issues.length - 1} more)` : "";
  return `${first.message}${path}${extra}`;
}
