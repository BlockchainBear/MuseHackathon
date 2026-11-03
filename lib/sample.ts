import { positionsFor, type World, type WorldDoc } from "./schema";

/**
 * Coherent offline sample world. Clearly labeled SAMPLE in the UI and
 * never presented as live-generated content.
 */
export const SAMPLE_IDEA =
  "A Pattaya night market hiding an underground racing league.";

const T = "2026-01-04T12:00:00.000Z";

export const SAMPLE_WORLD: World = {
  schemaVersion: 1,
  id: "sample-neon-night-market",
  createdAt: T,
  updatedAt: T,
  idea: SAMPLE_IDEA,
  genre: "Urban mystery",
  tone: "Neon-noir",
  name: "Neon Night Market",
  logline:
    "Beneath the lanterns and street food of a Pattaya night market, an underground racing league runs the alleys after midnight.",
  overview:
    "By day, the market is all grilled skewers, pirated vinyl, and bargaining tourists. By night, the shophouse shutters roll down and the back lanes belong to the Midnight Circuit: souped-up tuk-tuks and bikes racing between the stalls for stakes set by the market's shadow bookkeeper. The player maps the market, earns the racers' trust, and uncovers who really profits when engines scream past the lantern stalls.",
  visualDirection:
    "Rain-slicked streets reflecting magenta and cyan neon; dense hanging lanterns and tangled wires overhead; chrome and oil-stained garage interiors; humid night atmosphere with volumetric haze. Cinematic wide shots, high contrast, teal shadows with warm amber highlights.",
  locations: [
    {
      id: "loc-1",
      name: "Market Entrance",
      description:
        "A towering arch of rusted scaffolding wrapped in LED strips and paper lanterns. Food carts crowd the gates while touts shout over sizzling woks, and a chalkboard lists tonight's 'special deliveries' — coded race heats.",
      category: "Hub",
      keyProps: ["Neon arch gate", "Food cart row", "Coded chalkboard", "Ticket scalper stall"],
      imagePrompt:
        "Night market entrance arch covered in neon signs and paper lanterns, crowded food carts, wet reflective street, cinematic wide shot, teal and magenta palette",
    },
    {
      id: "loc-2",
      name: "Lantern Street",
      description:
        "The market's main artery, strung with hundreds of swaying lanterns. Stalls sell amulets, bootleg tapes, and engine parts with equal enthusiasm. Racers scout rivals here, pretending to haggle.",
      category: "Street",
      keyProps: ["Hanging lantern canopy", "Amulet stall", "Engine-parts vendor", "Overhead wire tangle"],
      imagePrompt:
        "Narrow night market street covered by a canopy of glowing red and gold lanterns, stalls on both sides, motorbikes parked along the lane, atmospheric haze",
    },
    {
      id: "loc-3",
      name: "Rooftop Lookout",
      description:
        "A tar-paper rooftop above a noodle shop with a sweeping view of the whole market grid. The league's spotters track every heat from here with radios and binoculars, signaling with colored flashlights.",
      category: "Vantage",
      keyProps: ["Radio spotter nest", "Signal flashlights", "Noodle-shop stairwell", "Pigeon coops"],
      imagePrompt:
        "Rooftop overlooking a neon night market, radio equipment and binoculars on a crate, city glow on the horizon, moody night sky, cinematic",
    },
    {
      id: "loc-4",
      name: "Secret Garage",
      description:
        "Behind a false freezer wall in a seafood stall, a cramped garage hums with welders and tuned engines. Mama Noi's crew rebuilds race bikes here between heats, paid in cash and silence.",
      category: "Hideout",
      keyProps: ["False freezer door", "Tuned race bikes", "Welder bench", "Cash lockbox"],
      imagePrompt:
        "Hidden underground garage behind a market stall, tuned motorbikes under work lamps, tools and spare parts, oil-stained concrete, dramatic rim lighting",
    },
    {
      id: "loc-5",
      name: "Underground Track",
      description:
        "A flooded service tunnel beneath the market, drained and lit with construction floods for midnight heats. Tire marks spiral around support pillars; the far end floods again at 3 AM sharp, ending all races.",
      category: "Track",
      keyProps: ["Flooded tunnel ring", "Construction floodlights", "Tire-marked pillars", "Starter gantry"],
      imagePrompt:
        "Underground service tunnel converted to a midnight race track, construction floodlights, reflective wet concrete, tire marks, motorbikes at a starting line",
    },
  ],
  npcs: [
    {
      id: "npc-1",
      name: "Mama Noi",
      role: "Garage boss and race fixer",
      personality:
        "Gruff, maternal, and ruthlessly practical. Speaks in food metaphors and never raises her voice twice.",
      dialogue:
        "You want to race my tunnel? Then you eat at my stall first. I don't trust a driver with an empty stomach or a full wallet.",
      locationId: "loc-4",
    },
    {
      id: "npc-2",
      name: "Kid Volt",
      role: "Rookie rider and spotter",
      personality:
        "Eighteen, fearless, and chronically broke. Idolizes the league champions and talks too fast when excited.",
      dialogue:
        "Saw the whole south heat from the roof! Blue bike took the pillar turn sideways — sideways! One day that's gonna be me. You watch.",
      locationId: "loc-3",
    },
    {
      id: "npc-3",
      name: "The Bookkeeper",
      role: "Shadow odds-setter",
      personality:
        "Nobody has seen their face. Polite typed notes, exact payouts, and a memory for every debt on the street.",
      dialogue:
        "Your stake is noted. Odds are three to one against the blue bike. Do try to finish the race — unpaid debts bore me.",
      locationId: "loc-2",
    },
  ],
  mainQuest: {
    id: "quest-main",
    title: "The Midnight Circuit",
    goal: "Earn a place in the league's championship heat and expose who skims the prize pool.",
    steps: [
      "Map the market and find the coded chalkboard at the entrance.",
      "Win Kid Volt's trust on the rooftop and learn the spotter signals.",
      "Deliver Mama Noi's engine part to unlock the secret garage.",
      "Race the underground tunnel qualifier before the 3 AM flood.",
      "Confront the Bookkeeper's collector at the championship heat.",
    ],
    locationIds: ["loc-1", "loc-3", "loc-4", "loc-5"],
  },
  sideQuests: [
    {
      id: "quest-side-1",
      title: "Lanterns for Luck",
      goal: "Replace the burnt-out lanterns on Lantern Street before the inspectors arrive at dawn.",
      locationId: "loc-2",
    },
    {
      id: "quest-side-2",
      title: "The Missing Piston",
      goal: "Track down the rare piston stolen from the secret garage before tonight's heat.",
      locationId: "loc-4",
    },
    {
      id: "quest-side-3",
      title: "Flood Timer",
      goal: "Recalibrate the tunnel pumps so the track stays dry ten minutes longer.",
      locationId: "loc-5",
    },
  ],
  assets: {
    categories: [
      { name: "Environment", items: ["Market arch gate", "Lantern canopy set", "Wet street material", "Tunnel ring segment"] },
      { name: "Props", items: ["Food cart", "Chalkboard", "Race bike", "Radio spotter kit", "Cash lockbox"] },
      { name: "Characters", items: ["Mama Noi", "Kid Volt", "Bookkeeper collector", "Crowd vendor set"] },
      { name: "FX & Audio", items: ["Neon flicker loop", "Flood water shader", "Market crowd bed", "Bike engine set"] },
    ],
  },
  blenderPrompt:
    "Blender production plan for 'Neon Night Market': block out the 5 map zones as linked collections at real-world scale (market arch 6m wide, lantern street 40m long, rooftop 8×10m, garage 6×8m, tunnel ring 60m loop). Model hero props first (arch gate, lantern canopy with instanced lanterns, race bike), then kit-bash stalls and pillars. Use a shared neon material library (emission shaders: magenta #ff2fb3, cyan #22d3ee) and one wet-asphalt material with clearcoat. Light with HDRI night + area-light Practicals; bake a combined albedo/roughness atlas per zone for export to Unreal via FBX. Deliverable: .blend per zone + shared material library.",
  unrealPrompt:
    "Unreal Engine planning prompts for 'Neon Night Market' (pre-production reference only — this tool does not export playable levels): create a persistent level with 5 sublevels matching the world-map zones; import FBX kits from Blender with Nanite enabled for arch/pillars and Instanced Static Meshes for lanterns. Build a wet-street master material (clearcoat + puddle mask) and a neon signage material with emissive flicker parameter. Lighting: Lumen night scene, sky atmosphere off, fog + volumetric haze, rect lights for floods. Gameplay stubs only: spline-based tunnel race path, trigger volumes at gate/chalkboard/garage, ambient crowd audio actors. Document asset checklist mapping per sublevel.",
  connections: [
    { from: "loc-1", to: "loc-2" },
    { from: "loc-2", to: "loc-3" },
    { from: "loc-2", to: "loc-4" },
    { from: "loc-4", to: "loc-5" },
    { from: "loc-3", to: "loc-5" },
  ],
};

export function makeSampleDoc(): WorldDoc {
  return {
    world: structuredClone(SAMPLE_WORLD),
    positions: positionsFor(SAMPLE_WORLD.locations.map((l) => l.id)),
    imageState: {},
    source: "sample",
    platforms: ["horizon", "roblox", "fortnite"],
  };
}

/** Bundled sample art shipped with the app (public/art). Labeled SAMPLE ART in the UI. */
export const SAMPLE_ART: Record<string, string> = {
  "loc-1": "/art/sample/loc-1.jpg",
  "loc-2": "/art/sample/loc-2.jpg",
  "loc-3": "/art/sample/loc-3.jpg",
  "loc-4": "/art/sample/loc-4.jpg",
  "loc-5": "/art/sample/loc-5.jpg",
};

/** Deterministic mock content for tests: valid content shaped like model output. */
export function mockGeneratedContent(idea: string, genre: string, tone: string) {
  const w = structuredClone(SAMPLE_WORLD);
  return {
    name: `Realm of ${idea.slice(0, 24) || "Echoes"}`,
    logline: w.logline,
    overview: w.overview,
    visualDirection: w.visualDirection,
    locations: w.locations,
    npcs: w.npcs,
    mainQuest: w.mainQuest,
    sideQuests: w.sideQuests,
    assets: w.assets,
    blenderPrompt: w.blenderPrompt,
    unrealPrompt: w.unrealPrompt,
    connections: w.connections,
    _meta: { idea, genre, tone },
  };
}
