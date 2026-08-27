/**
 * Fixture classification.
 *
 * Capture writes stub GDTF profiles into its MVR exports: they carry generic
 * Dimmer1..N channels and no <Beam> physical description at all, so beam angle,
 * optics and even fixture category cannot be read from the GDTF. What is
 * reliable is the manufacturer/model name, which is what this classifier uses.
 */

export type FixtureKind =
  "beam" | "spot" | "wash" | "bar" | "strobe" | "blinder" | "laser" | "effect";

export type KindOptics = {
  /** Cone angle in degrees. */
  angle: number;
  /** Throw distance in meters. */
  length: number;
  /** Relative brightness. */
  intensity: number;
  color: string;
  /** Effects (fog, pyro, confetti) emit no light beam. */
  emits: boolean;
};

export const KIND_OPTICS: Record<FixtureKind, KindOptics> = {
  // Tight parallel beam: narrow, long, punchy.
  beam: { angle: 4, length: 18, intensity: 1.2, color: "#dfe8ff", emits: true },
  // Profile/spot: still narrow but softer than a beam.
  spot: { angle: 14, length: 14, intensity: 1, color: "#ffffff", emits: true },
  // Wash: wide and soft, shorter useful throw.
  wash: { angle: 38, length: 9, intensity: 0.75, color: "#ffeedd", emits: true },
  // LED bar / pixel strip: broad, very short spill.
  bar: { angle: 55, length: 4, intensity: 0.6, color: "#ffffff", emits: true },
  strobe: { angle: 70, length: 5, intensity: 1.1, color: "#ffffff", emits: true },
  blinder: { angle: 60, length: 6, intensity: 0.9, color: "#ffd9a0", emits: true },
  // Laser: near-parallel, saturated, travels far.
  laser: { angle: 1, length: 25, intensity: 1.4, color: "#66ff99", emits: true },
  effect: { angle: 0, length: 0, intensity: 0, color: "#8899aa", emits: false },
};

// Order matters: the first matching rule wins, so specific terms precede
// generic ones ("laser bar" must classify as a laser, not a bar).
const RULES: Array<{ kind: FixtureKind; patterns: RegExp }> = [
  {
    kind: "effect",
    patterns: /smoke|fog|haze|jet|co2|cryo|confetti|flame|spark|pyro|unique|magicfx|explo/i,
  },
  { kind: "laser", patterns: /laser/i },
  { kind: "strobe", patterns: /strobe|atomic/i },
  { kind: "blinder", patterns: /blinder|sunstrip|molefay/i },
  { kind: "beam", patterns: /\bbeam\b|pointe|sniper|viper|bmfl|megapointe/i },
  { kind: "spot", patterns: /spot|profile|leko|source ?four|ellipsoid/i },
  { kind: "bar", patterns: /\bbar\b|pixel|rail|batten|strip|tube|ub\d|linear/i },
  { kind: "wash", patterns: /wash|impression|par\b|fresnel|cyc|flood|spiider|zoom/i },
];

/** Classifies a fixture from its MVR name and GDTF spec filename. */
export function classifyFixture(name: string, gdtfSpec?: string | null): FixtureKind {
  const haystack = `${name} ${gdtfSpec ?? ""}`;
  for (const rule of RULES) {
    if (rule.patterns.test(haystack)) return rule.kind;
  }
  // Unrecognized fixtures are treated as washes: visible but unobtrusive.
  return "wash";
}
