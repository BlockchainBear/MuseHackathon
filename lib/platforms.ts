/**
 * Creator-platform packs: deterministic build guides that turn the world
 * bible into per-platform production material for Horizon Worlds, Roblox,
 * and Fortnite (UEFN). Planning scaffolds only — starter prompts,
 * checklists, and short code sketches to adapt inside each platform's
 * editor. This tool does not export playable levels.
 */
import type { Platform, WorldDoc } from "./schema";

export const PLATFORM_META: Record<
  Platform,
  { name: string; short: string; tagline: string; color: string; language: string }
> = {
  horizon: {
    name: "Horizon Worlds",
    short: "Horizon",
    tagline: "Meta's social VR worlds",
    color: "#8b9bff",
    language: "TypeScript",
  },
  roblox: {
    name: "Roblox",
    short: "Roblox",
    tagline: "Roblox Studio experiences",
    color: "#ff4d5e",
    language: "Luau",
  },
  fortnite: {
    name: "Fortnite (UEFN)",
    short: "Fortnite",
    tagline: "Unreal Editor for Fortnite islands",
    color: "#b78bff",
    language: "Verse",
  },
};

export interface PlatformPack {
  platform: Platform;
  prompt: string;
  checklist: string[];
  scriptTitle: string;
  scriptLanguage: string;
  script: string;
}

function locList(doc: WorldDoc): string {
  return doc.world.locations.map((l, i) => `${i + 1}. "${l.name}" (${l.category}) — ${l.description}`).join("\n");
}

function promptFor(doc: WorldDoc, platform: Platform): string {
  const w = doc.world;
  const base =
    `Build "${w.name}" (${w.genre}, ${w.tone}) as five connected zones:\n${locList(doc)}\n` +
    `Style: ${w.visualDirection}\nQuests: main "${w.mainQuest.title}" + ${w.sideQuests.length} side quests. ` +
    `Cast: ${w.npcs.map((n) => `"${n.name}" (${n.role})`).join(", ")}.`;
  if (platform === "horizon") {
    return (
      `${base}\n\nHorizon Worlds plan: block out each zone with primitive shapes first, then swap in ` +
      `asset-library meshes. Design for mobile VR budgets: few draw calls, baked lighting feel, generous ` +
      `colliders. Put each NPC on a spawn point with a proximity dialogue trigger. Chain quest steps as ` +
      `one gift/objective handoff per zone. Script hub travel + quest state in TypeScript; test on Quest ` +
      `headset early for scale and comfort.`
    );
  }
  if (platform === "roblox") {
    return (
      `${base}\n\nRoblox plan: lay the five zones out in studs (streets ~8 studs wide, interiors 2 floors max ` +
      `to start). Enable StreamingEnabled, use Packages for repeated stalls/props, keep per-zone part counts ` +
      `lean. NPCs get ProximityPrompts with their dialogue lines; quest steps become ordered ObjectiveValues ` +
      `with checkpoint pads. Drive travel + quest state from one Luau hub Script; playtest on mobile + console.`
    );
  }
  return (
    `${base}\n\nUEFN/Fortnite plan: five sub-areas on one island grid with a teleporter hub between them. ` +
    `Stay inside the island memory budget: prefab repeated stalls/props, verse-driven state only. Each NPC ` +
    `becomes a character device + dialogue device with its line; quest steps map to tracker devices in order. ` +
    `Script hub travel + quest gates in Verse; validate in a live edit session on target hardware.`
  );
}

function checklistFor(doc: WorldDoc, platform: Platform): string[] {
  const w = doc.world;
  const zones = w.locations.map((l) => `Block out "${l.name}" (${l.category}): ${l.keyProps.slice(0, 3).join("; ")}`);
  const cast = w.npcs.map((n) => `Place "${n.name}" with dialogue trigger: "${n.dialogue.slice(0, 80)}${n.dialogue.length > 80 ? "…" : ""}"`);
  const quests = [
    `Main quest "${w.mainQuest.title}": ${w.mainQuest.steps.length} ordered objectives across ${w.mainQuest.locationIds.length} zones`,
    ...w.sideQuests.map((q) => `Side quest "${q.title}" in its home zone`),
  ];
  const tail =
    platform === "horizon"
      ? ["Keep draw calls low for mobile VR", "TypeScript hub: travel + quest state", "Comfort pass on Quest headset"]
      : platform === "roblox"
        ? ["StreamingEnabled + Packages for repeats", "Luau hub: travel + ObjectiveValues", "Playtest mobile + console"]
        : ["Watch island memory budget", "Verse hub: travel + tracker gates", "Validate in live edit session"];
  return [...zones, ...cast, ...quests, ...tail];
}

function scriptFor(doc: WorldDoc, platform: Platform): { title: string; language: string; script: string } {
  const w = doc.world;
  if (platform === "roblox") {
    const rows = w.locations.map((l) => `  ["${l.id}"] = "${l.name.replace(/"/g, "'")}",`).join("\n");
    return {
      title: "Hub travel Script (ServerScriptService)",
      language: "Luau",
      script: [
        `-- WorldForge starter: ${w.name} (adapt in Roblox Studio)`,
        `local LOCATIONS = {`,
        rows,
        `}`,
        ``,
        `local pads = workspace:WaitForChild("TravelPads")`,
        `local function gotoLocation(player, locId)`,
        `  local character = player.Character`,
        `  local pad = pads:FindFirstChild(locId)`,
        `  if character and pad then`,
        `    character:PivotTo(pad.CFrame + Vector3.new(0, 3, 0))`,
        `  end`,
        `end`,
        ``,
        `-- Connect one ProximityPrompt per zone pad to gotoLocation,`,
        `-- then gate prompts by quest ObjectiveValues as steps complete.`,
        `return { gotoLocation = gotoLocation, locations = LOCATIONS }`,
      ].join("\n"),
    };
  }
  if (platform === "fortnite") {
    return {
      title: "Hub device (Verse)",
      language: "Verse",
      script: [
        `# WorldForge starter: ${w.name} (adapt in UEFN)`,
        `using { /Fortnite.com/Devices }`,
        `using { /Verse.org/Simulation }`,
        ``,
        `worldforge_hub := class(creative_device):`,
        `    # Add one teleporter_device per zone in the editor:`,
        ...w.locations.map((l) => `    # - ${l.id}: ${l.name.replace(/#/g, "")}`),
        `    Pad1 : teleporter_device = teleporter_device{}`,
        `    Pad2 : teleporter_device = teleporter_device{}`,
        ``,
        `    OnBegin<override>()<suspends> : void =`,
        `        Print("WorldForge hub ready: ${w.name.replace(/"/g, "'")}")`,
      ].join("\n"),
    };
  }
  return {
    title: "Hub component (TypeScript)",
    language: "TypeScript",
    script: [
      `// WorldForge starter: ${w.name} (adapt in the Horizon desktop editor)`,
      `import * as hz from 'horizon/core';`,
      ``,
      `const LOCATIONS = [`,
      ...w.locations.map((l) => `  { id: '${l.id}', name: '${l.name.replace(/'/g, "")}' },`),
      `] as const;`,
      ``,
      `class WorldHub extends hz.Component<typeof WorldHub> {`,
      `  static propsDefinition = {};`,
      `  start() {`,
      `    console.log('WorldForge hub ready: ' + LOCATIONS.length + ' zones');`,
      `    // Teleport players between zone spawn points here,`,
      `    // and advance quest state as each handoff completes.`,
      `  }`,
      `}`,
      `hz.Component.register(WorldHub);`,
    ].join("\n"),
  };
}

export function buildPlatformPack(doc: WorldDoc, platform: Platform): PlatformPack {
  const s = scriptFor(doc, platform);
  return {
    platform,
    prompt: promptFor(doc, platform),
    checklist: checklistFor(doc, platform),
    scriptTitle: s.title,
    scriptLanguage: s.language,
    script: s.script,
  };
}

export function buildPlatformsMd(doc: WorldDoc): string {
  const lines: string[] = [
    `# ${doc.world.name} — Creator platform packs`,
    ``,
    `Targets: ${doc.platforms.map((p) => PLATFORM_META[p].name).join(", ")}.`,
    `Planning scaffolds to adapt inside each platform editor — not playable level exports.`,
    ``,
  ];
  for (const p of doc.platforms) {
    const pack = buildPlatformPack(doc, p);
    lines.push(`## ${PLATFORM_META[p].name}`, ``, pack.prompt, ``, `### Build checklist`, ``);
    for (const item of pack.checklist) lines.push(`- [ ] ${item}`);
    lines.push(``, `### Starter: ${pack.scriptTitle} (${pack.scriptLanguage})`, ``, "```", pack.script, "```", ``);
  }
  return lines.join("\n");
}
