import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { mvrDirectionToViewer, mvrPointToViewer, parseMvr, parseMvrMatrix } from "@/lib/mvr";

function mvrArchive(xml: string, name = "GeneralSceneDescription.xml") {
  return zipSync({ [name]: strToU8(xml) });
}

describe("coordinate conversion", () => {
  it("converts MVR millimetres, Z-up to viewer metres, Y-up", () => {
    expect(mvrPointToViewer(1000, 2000, 4200)).toEqual({ x: 1, y: 4.2, z: -2 });
  });

  it("normalises directions and handles a zero vector", () => {
    const d = mvrDirectionToViewer(0, 0, -5);
    expect(d.x).toBeCloseTo(0);
    expect(d.y).toBeCloseTo(-1);
    expect(d.z).toBeCloseTo(0);
    expect(mvrDirectionToViewer(0, 0, 0)).toEqual({ x: 0, y: -1, z: 0 });
  });
});

describe("parseMvrMatrix", () => {
  it("reads the w axis and origin", () => {
    const m = parseMvrMatrix("{1,0,0}{0,1,0}{0,0,1}{500,-250,4200}");
    expect(m).toEqual({ w: { x: 0, y: 0, z: 1 }, origin: { x: 500, y: -250, z: 4200 } });
  });

  it("rejects malformed matrices", () => {
    expect(parseMvrMatrix("{1,0,0}{0,1,0}")).toBeNull();
    expect(parseMvrMatrix("{1,0,0}{0,1,0}{0,0,x}{0,0,0}")).toBeNull();
    expect(parseMvrMatrix("{1,0}{0,1,0}{0,0,1}{0,0,0}")).toBeNull();
  });
});

describe("parseMvr", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <GeneralSceneDescription verMajor="1" verMinor="5">
      <Scene><Layers>
        <Layer name="Truss">
          <ChildList>
            <Fixture name="Spot 1" uuid="a">
              <GDTFSpec>Robe@MegaPointe.gdtf</GDTFSpec>
              <Matrix>{1,0,0}{0,1,0}{0,0,1}{1000,2000,4200}</Matrix>
              <Addresses><Address break="0">1025</Address></Addresses>
            </Fixture>
            <GroupObject name="Group"><ChildList>
              <Fixture name="Wash 2" uuid="b">
                <Matrix>{1,0,0}{0,1,0}{0,0,1}{0,0,3000}</Matrix>
              </Fixture>
            </ChildList></GroupObject>
          </ChildList>
        </Layer>
        <Layer name="Floor"><ChildList>
          <Fixture uuid="c"><GDTFSpec>Hazer.gdtf</GDTFSpec></Fixture>
        </ChildList></Layer>
      </Layers></Scene>
    </GeneralSceneDescription>`;

  it("collects fixtures from nested layers and groups", () => {
    const fixtures = parseMvr(mvrArchive(xml));
    expect(fixtures.map((f) => f.name)).toEqual(["Spot 1", "Wash 2", "Hazer.gdtf"]);
  });

  it("converts position, aims along -w and decodes the DMX address", () => {
    const [spot] = parseMvr(mvrArchive(xml));
    expect(spot).toMatchObject({ x: 1, y: 4.2, z: -2, gdtfSpec: "Robe@MegaPointe.gdtf" });
    // w = +Z (up) in MVR, so the beam points straight down in the viewer.
    expect(spot.dirY).toBeCloseTo(-1);
    // Absolute 1025 = universe 3, channel 2 (both 1-based).
    expect(spot.universe).toBe(3);
    expect(spot.address).toBe(2);
  });

  it("defaults a fixture without matrix or address", () => {
    const hazer = parseMvr(mvrArchive(xml))[2];
    expect(hazer).toMatchObject({ x: 0, y: 0, z: -0, universe: null, address: null });
    expect(hazer.dirY).toBeCloseTo(-1);
  });

  it("finds the scene file case-insensitively in a subfolder", () => {
    expect(parseMvr(mvrArchive(xml, "sub/generalscenedescription.XML"))).toHaveLength(3);
  });

  it("throws when the archive has no scene description", () => {
    expect(() => parseMvr(zipSync({ "readme.txt": strToU8("hi") }))).toThrow(
      /GeneralSceneDescription/,
    );
  });
});
