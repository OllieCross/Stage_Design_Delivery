import { describe, expect, it } from "vitest";
import { KIND_OPTICS, classifyFixture } from "@/lib/fixture-kinds";

describe("classifyFixture", () => {
  it.each([
    ["Robe MegaPointe", "beam"],
    ["Robin Pointe 1", "beam"],
    ["Claypaky Sharpy Beam", "beam"],
    ["Martin Mac Viper Profile", "beam"],
    ["ETC Source Four", "spot"],
    ["Generic Spot 575", "spot"],
    ["GLP impression X4 Bar 20", "bar"],
    ["Astera Titan Tube", "bar"],
    ["LED Pixel Strip", "bar"],
    ["Robe Spiider", "wash"],
    ["LED PAR 64", "wash"],
    ["Martin Atomic 3000", "strobe"],
    ["2-Lite Molefay Blinder", "blinder"],
    ["Kvant Laser Bar", "laser"],
    ["Look Unique 2.1 Hazer", "effect"],
    ["MagicFX CO2 Jet", "effect"],
    ["Pyro flame unit", "effect"],
  ])("%s -> %s", (name, kind) => {
    expect(classifyFixture(name)).toBe(kind);
  });

  it("puts specific rules before generic ones (laser bar is a laser)", () => {
    expect(classifyFixture("Laser Bar")).toBe("laser");
    expect(classifyFixture("Strobe Bar")).toBe("strobe");
  });

  it("uses the GDTF spec name too", () => {
    expect(classifyFixture("Fixture 12", "Robe_Lighting@MegaPointe.gdtf")).toBe("beam");
  });

  it("falls back to wash for unknown fixtures", () => {
    expect(classifyFixture("Mystery Box 3000")).toBe("wash");
    expect(classifyFixture("", null)).toBe("wash");
  });

  it("gives every kind sane optics and only effects emit nothing", () => {
    for (const [kind, o] of Object.entries(KIND_OPTICS)) {
      expect(o.color).toMatch(/^#[0-9a-f]{6}$/i);
      if (kind === "effect") expect(o.emits).toBe(false);
      else {
        expect(o.emits).toBe(true);
        expect(o.angle).toBeGreaterThan(0);
        expect(o.length).toBeGreaterThan(0);
      }
    }
  });
});
