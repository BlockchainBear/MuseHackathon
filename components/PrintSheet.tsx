import type { WorldDoc } from "@/lib/schema";
import { PLATFORM_META } from "@/lib/platforms";

/**
 * Print-only sheet for browser "Save as PDF". Rendered always, shown only
 * in @media print. All content is React-escaped text (never raw markup).
 */
export function PrintSheet({ doc, imageUrls }: { doc: WorldDoc; imageUrls: Record<string, string> }) {
  const w = doc.world;
  const locName = (id: string) => w.locations.find((l) => l.id === id)?.name ?? id;
  return (
    <div className="print-sheet mx-auto max-w-3xl px-6 py-8 text-[13px] leading-relaxed">
      <p style={{ fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>WORLDFORGE LITE · WORLD BIBLE</p>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: "4px 0" }}>{w.name}</h1>
      <p style={{ fontStyle: "italic" }}>{w.logline}</p>
      <p>
        {w.genre} · {w.tone} · Source: {doc.source}
      </p>
      <p>Build targets: {doc.platforms.map((p) => PLATFORM_META[p].name).join(", ")}</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 16 }}>Setting Overview</h2>
      <p>{w.overview}</p>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>Visual Direction</h2>
      <p>{w.visualDirection}</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 16 }}>Locations</h2>
      {w.locations.map((l) => (
        <section key={l.id} style={{ marginTop: 10, breakInside: "avoid" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>
            {l.name} <span style={{ fontWeight: 400 }}>({l.category})</span>
          </h3>
          <p>{l.description}</p>
          <p>
            <strong>Key props:</strong> {l.keyProps.join("; ")}
          </p>
          {imageUrls[l.id] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrls[l.id]} alt={`Concept art for ${l.name}`} style={{ maxWidth: 420, marginTop: 6 }} />
          )}
        </section>
      ))}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 16 }}>NPCs</h2>
      {w.npcs.map((n) => (
        <section key={n.id} style={{ marginTop: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>
            {n.name} — {n.role} ({locName(n.locationId)})
          </h3>
          <p>{n.personality}</p>
          <p style={{ fontStyle: "italic" }}>“{n.dialogue}”</p>
        </section>
      ))}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 16 }}>Main Quest: {w.mainQuest.title}</h2>
      <p>{w.mainQuest.goal}</p>
      <ol style={{ paddingLeft: 20 }}>
        {w.mainQuest.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>Side Quests</h2>
      {w.sideQuests.map((q) => (
        <p key={q.id}>
          <strong>{q.title}</strong> ({locName(q.locationId)}): {q.goal}
        </p>
      ))}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 16 }}>Asset Checklist</h2>
      {w.assets.categories.map((c) => (
        <div key={c.name} style={{ marginTop: 6 }}>
          <p>
            <strong>{c.name}</strong>
          </p>
          <ul style={{ paddingLeft: 20 }}>
            {c.items.map((it) => (
              <li key={it}>☐ {it}</li>
            ))}
          </ul>
        </div>
      ))}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 16 }}>Production Prompts</h2>
      <h3 style={{ fontWeight: 700 }}>Blender</h3>
      <p>{w.blenderPrompt}</p>
      <h3 style={{ fontWeight: 700, marginTop: 8 }}>Unreal (planning reference only)</h3>
      <p>{w.unrealPrompt}</p>
    </div>
  );
}
