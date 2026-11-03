/**
 * Export builders: JSON, standalone SVG, Markdown bible, ZIP kit.
 * Pure string builders (testable in Node) plus browser download helpers.
 */
import { MAP_HEIGHT, MAP_WIDTH, SCHEMA_VERSION, type WorldDoc } from "./schema";

export interface ExportEnvelope {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  note: string;
  doc: WorldDoc;
}

export function buildExportEnvelope(doc: WorldDoc): ExportEnvelope {
  return {
    app: "worldforge-lite",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    note: "JSON contains world content, map positions, and image metadata, but no binary image data. Use the ZIP world kit for images.",
    doc,
  };
}

export function buildWorldJson(doc: WorldDoc): string {
  return JSON.stringify(buildExportEnvelope(doc), null, 2);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapLabel(name: string, maxChars = 18): string[] {
  const words = name.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
    if (lines.length >= 2) break;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/** Standalone map SVG with embedded styles and readable labels. */
export function buildMapSvg(doc: WorldDoc): string {
  const { world, positions } = doc;
  const edges = world.connections
    .map((c) => {
      const a = positions[c.from];
      const b = positions[c.to];
      if (!a || !b) return "";
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="edge"/>`;
    })
    .join("\n    ");

  const nodes = world.locations
    .map((loc) => {
      const p = positions[loc.id];
      if (!p) return "";
      const lines = wrapLabel(loc.name);
      const text = lines
        .map((ln, i) => `<text x="${p.x}" y="${p.y + 44 + i * 18}" class="label">${esc(ln)}</text>`)
        .join("");
      return (
        `<g class="node">\n` +
        `      <circle cx="${p.x}" cy="${p.y}" r="26" class="halo"/>\n` +
        `      <circle cx="${p.x}" cy="${p.y}" r="20" class="dot"/>\n` +
        `      <text x="${p.x}" y="${p.y + 6}" class="num">${esc(loc.id.replace("loc-", ""))}</text>\n` +
        `      ${text}\n` +
        `      <text x="${p.x}" y="${p.y + 44 + lines.length * 18}" class="cat">${esc(loc.category)}</text>\n` +
        `    </g>`
      );
    })
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" role="img" aria-label="Map of ${esc(world.name)}">
  <style>
    .bg { fill: #0a0c12; }
    .title { fill: #f1f5f9; font: 700 28px system-ui, sans-serif; }
    .edge { stroke: #22d3ee; stroke-width: 2.5; opacity: 0.55; }
    .halo { fill: none; stroke: #a78bfa; stroke-width: 1.5; opacity: 0.5; }
    .dot { fill: #171b27; stroke: #22d3ee; stroke-width: 2.5; }
    .num { fill: #22d3ee; font: 700 16px system-ui, sans-serif; text-anchor: middle; }
    .label { fill: #f1f5f9; font: 600 15px system-ui, sans-serif; text-anchor: middle; }
    .cat { fill: #9aa3b2; font: 12px system-ui, sans-serif; text-anchor: middle; }
  </style>
  <rect class="bg" x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="16"/>
  <text class="title" x="32" y="52">${esc(world.name)} — Location Map</text>
  <g>
    ${edges}
  </g>
  <g>
    ${nodes}
  </g>
</svg>
`;
}

export function buildWorldBibleMd(doc: WorldDoc): string {
  const w = doc.world;
  const lines: string[] = [];
  lines.push(`# ${w.name}`, "");
  lines.push(`> ${w.logline}`, "");
  lines.push(`- **Idea:** ${w.idea}`);
  lines.push(`- **Genre:** ${w.genre} · **Tone:** ${w.tone}`);
  lines.push(`- **Source:** ${doc.source} · **Exported:** ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Setting Overview", "", w.overview, "");
  lines.push("## Visual Direction", "", w.visualDirection, "");
  lines.push("## Locations", "");
  for (const loc of w.locations) {
    lines.push(`### ${loc.name} (\`${loc.id}\` · ${loc.category})`, "", loc.description, "");
    lines.push(`**Key props:** ${loc.keyProps.join("; ")}`, "");
    lines.push(`**Concept-art prompt:** ${loc.imagePrompt}`, "");
  }
  lines.push("## NPCs", "");
  for (const n of w.npcs) {
    lines.push(`### ${n.name} — ${n.role} (\`${n.id}\`)`, "", `**Location:** \`${n.locationId}\``, "", `**Personality:** ${n.personality}`, "", `> "${n.dialogue}"`, "");
  }
  lines.push("## Main Quest", "", `### ${w.mainQuest.title}`, "", w.mainQuest.goal, "");
  w.mainQuest.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push("", `**Locations:** ${w.mainQuest.locationIds.map((id) => `\`${id}\``).join(", ")}`, "");
  lines.push("## Side Quests", "");
  for (const q of w.sideQuests) {
    lines.push(`### ${q.title} (\`${q.id}\`)`, "", q.goal, "", `**Location:** \`${q.locationId}\``, "");
  }
  lines.push("## Asset Checklist", "");
  for (const c of w.assets.categories) {
    lines.push(`### ${c.name}`, "");
    for (const item of c.items) lines.push(`- [ ] ${item}`);
    lines.push("");
  }
  lines.push("## Creator Platforms", "", `Targets: ${doc.platforms.join(", ")}. See platforms.md in the ZIP kit for per-platform build guides.`, "");
  lines.push("## Production Prompts", "", "### Blender", "", w.blenderPrompt, "", "### Unreal (pre-production reference only — not playable levels)", "", w.unrealPrompt, "");
  lines.push("## Map Connections", "");
  if (w.connections.length === 0) lines.push("_No connections defined._", "");
  for (const c of w.connections) lines.push(`- \`${c.from}\` ↔ \`${c.to}\``);
  lines.push("");
  return lines.join("\n");
}

export function buildKitReadme(doc: WorldDoc): string {
  return [
    `# ${doc.world.name} — WorldForge Lite world kit`,
    ``,
    `Exported ${new Date().toISOString()} from WorldForge Lite (schema v${SCHEMA_VERSION}).`,
    `Source: ${doc.source}. This is a world-planning kit, not a playable game level.`,
    ``,
    `## Contents`,
    ``,
    `- world.json — full world content, map positions, metadata, schema version (no binary image data).`,
    `- map.svg — standalone location map with embedded styles.`,
    `- world-bible.md — readable world bible: locations, NPCs, quests, assets, production prompts.`,
    `- platforms.md — Horizon Worlds / Roblox / Fortnite build guides with starter scripts.`,
    `- images/ — generated concept art PNG/WebP files (only locations with ready art are included).`,
    `- README.md — this file.`,
    ``,
    `## Notes`,
    ``,
    `- Concept art is 2D illustration reference, not 3D assets.`,
    `- Re-import world.json via the app's Import action to restore the world (images are not embedded).`,
    ``,
  ].join("\n");
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "world"
  );
}

/* ------------------------- browser download ------------------------- */

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadText(text: string, filename: string, mime = "application/json"): void {
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
}
