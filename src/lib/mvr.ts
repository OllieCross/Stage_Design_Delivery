import { XMLParser } from "fast-xml-parser";
import { unzipSync } from "fflate";

/**
 * Minimal MVR (My Virtual Rig) reader: pulls lighting fixtures out of the
 * GeneralSceneDescription.xml inside the MVR zip.
 *
 * MVR uses millimeters and is Z-up; the viewer uses meters and is Y-up (the
 * glTF convention), so positions and directions are converted on the way out.
 */

export type ParsedFixture = {
  name: string;
  gdtfSpec: string | null;
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirY: number;
  dirZ: number;
  universe: number | null;
  address: number | null;
};

/** MVR millimeters, Z-up -> viewer meters, Y-up. */
export function mvrPointToViewer(x: number, y: number, z: number) {
  return { x: x / 1000, y: z / 1000, z: -y / 1000 };
}

/** Same basis change for directions, without the millimeter scaling. */
export function mvrDirectionToViewer(x: number, y: number, z: number) {
  const v = { x, y: z, z: -y };
  const len = Math.hypot(v.x, v.y, v.z);
  if (len === 0) return { x: 0, y: -1, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * An MVR <Matrix> is "{ux,uy,uz}{vx,vy,vz}{wx,wy,wz}{ox,oy,oz}": three basis
 * vectors followed by the origin. The w axis runs from the head toward the
 * base, so a rigged fixture's beam leaves along -w (verified against a Capture
 * export where truss-hung moving heads at 4.2 m all carry w = +Z).
 */
export function parseMvrMatrix(raw: string) {
  const groups = raw.match(/\{([^}]*)\}/g);
  if (!groups || groups.length < 4) return null;
  const nums = groups.map((g) =>
    g
      .slice(1, -1)
      .split(",")
      .map((n) => Number(n.trim())),
  );
  if (nums.some((row) => row.length < 3 || row.some((n) => !Number.isFinite(n)))) return null;
  const [, , w, o] = nums;
  return { w: { x: w[0], y: w[1], z: w[2] }, origin: { x: o[0], y: o[1], z: o[2] } };
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

type XmlNode = Record<string, unknown>;

/** Walks the layer/child tree collecting every <Fixture> element. */
function collectFixtures(node: unknown, out: XmlNode[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectFixtures(item, out);
    return;
  }
  const obj = node as XmlNode;
  for (const [key, value] of Object.entries(obj)) {
    if (key === "Fixture") {
      for (const fixture of asArray(value as XmlNode | XmlNode[])) out.push(fixture);
    } else if (typeof value === "object") {
      collectFixtures(value, out);
    }
  }
}

function readAddress(fixture: XmlNode): { universe: number | null; address: number | null } {
  // <Addresses><Address break="0">1025</Address></Addresses>
  // The absolute address packs universe and channel: universe = floor(a/512).
  const addresses = fixture.Addresses as XmlNode | undefined;
  const first = asArray(addresses?.Address as XmlNode | XmlNode[] | undefined)[0];
  const raw = typeof first === "object" ? (first as XmlNode)["#text"] : first;
  const absolute = Number(raw);
  if (!Number.isFinite(absolute)) return { universe: null, address: null };
  return { universe: Math.floor(absolute / 512) + 1, address: (absolute % 512) + 1 };
}

export function parseMvr(buffer: Uint8Array): ParsedFixture[] {
  const files = unzipSync(buffer);
  const entry = Object.keys(files).find((n) =>
    n.toLowerCase().endsWith("generalscenedescription.xml"),
  );
  if (!entry) {
    throw new Error("MVR archive has no GeneralSceneDescription.xml");
  }

  const xml = new TextDecoder().decode(files[entry]);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml) as XmlNode;

  const raw: XmlNode[] = [];
  collectFixtures(doc, raw);

  const fixtures: ParsedFixture[] = [];
  for (const f of raw) {
    const matrix = typeof f.Matrix === "string" ? parseMvrMatrix(f.Matrix) : null;
    // A fixture without a matrix sits at the origin aiming straight down.
    const origin = matrix?.origin ?? { x: 0, y: 0, z: 0 };
    const w = matrix?.w ?? { x: 0, y: 0, z: 1 };
    const position = mvrPointToViewer(origin.x, origin.y, origin.z);
    const direction = mvrDirectionToViewer(-w.x, -w.y, -w.z);
    const { universe, address } = readAddress(f);
    const gdtfSpec = typeof f.GDTFSpec === "string" ? f.GDTFSpec : null;

    fixtures.push({
      name: String(f["@_name"] ?? gdtfSpec ?? "Fixture"),
      gdtfSpec,
      x: position.x,
      y: position.y,
      z: position.z,
      dirX: direction.x,
      dirY: direction.y,
      dirZ: direction.z,
      universe,
      address,
    });
  }

  return fixtures;
}
