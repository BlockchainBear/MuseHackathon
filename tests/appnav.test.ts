import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { AppNav } from "../components/AppNav";
import { CreateView } from "../components/CreateView";

const WORKSPACE_DISABLED = /<button[^>]*disabled=""[^>]*>[\s\S]*?Workspace/;

describe("AppNav", () => {
  it("marks the active section and disables workspace with no open world", () => {
    const html = renderToString(
      createElement(AppNav, { view: "saved", docOpen: false, worldName: null, onNavigate: () => {} }),
    );
    expect(html).toContain("aria-current=\"page\"");
    expect(WORKSPACE_DISABLED.test(html)).toBe(true);
    expect(html).not.toContain("Neon Night Market");
  });

  it("enables workspace and names the open world", () => {
    const html = renderToString(
      createElement(AppNav, {
        view: "workspace",
        docOpen: true,
        worldName: "Neon Night Market",
        onNavigate: () => {},
      }),
    );
    expect(WORKSPACE_DISABLED.test(html)).toBe(false);
    expect(html).toContain("Neon Night Market");
  });
});

describe("CreateView", () => {
  const props = {
    generating: false,
    error: null,
    liveReady: null,
    onGenerate: () => {},
    onSample: () => {},
    onImport: () => {},
    onInteract: () => {},
  };

  it("keeps the riff panel collapsed by default (composer first, not chat)", () => {
    const html = renderToString(createElement(CreateView, props));
    expect(html).toContain("Riff with an AI partner");
    expect(html).not.toContain("Yo — pitch me a world");
  });

  it("shows the composer and starters up front", () => {
    const html = renderToString(createElement(CreateView, props));
    expect(html).toContain("The pitch");
    expect(html).toContain("Sky-Whale Ranch");
    expect(html).toContain("Generate World");
  });
});
