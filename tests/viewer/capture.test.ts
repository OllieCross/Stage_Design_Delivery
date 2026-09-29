// @vitest-environment jsdom
import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CAPTURE_HEIGHT,
  CAPTURE_WIDTH,
  JPEG_QUALITY,
  canvasToJpeg,
  captureBaseName,
  chooseSaveTarget,
  renderViewport,
  saveBlob,
  showPrintPage,
  tileLayout,
} from "@/components/viewer/capture";

const drawImage = vi.fn();

beforeEach(() => {
  drawImage.mockReset();
  // jsdom has no 2D canvas; a recording stub is all renderViewport needs.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  URL.createObjectURL = vi.fn(() => "blob:capture");
  URL.revokeObjectURL = vi.fn();
});

describe("tileLayout", () => {
  it("splits 4K into four 1080p tiles", () => {
    expect(tileLayout(3840, 2160, 2, 2)).toEqual([
      { x: 0, y: 0, w: 1920, h: 1080 },
      { x: 1920, y: 0, w: 1920, h: 1080 },
      { x: 0, y: 1080, w: 1920, h: 1080 },
      { x: 1920, y: 1080, w: 1920, h: 1080 },
    ]);
  });

  it("covers every pixel exactly once even when sizes don't divide", () => {
    const tiles = tileLayout(1001, 499, 3, 2);
    expect(tiles.reduce((a, t) => a + t.w * t.h, 0)).toBe(1001 * 499);
    expect(Math.max(...tiles.map((t) => t.x + t.w))).toBe(1001);
    expect(Math.max(...tiles.map((t) => t.y + t.h))).toBe(499);
  });
});

describe("captureBaseName", () => {
  it("slugs the model name and stamps the local time", () => {
    const d = new Date(2026, 8, 29, 14, 3);
    expect(captureBaseName("Main Stage (final).glb", d)).toBe("main-stage-final_2026-09-29_1403");
    expect(captureBaseName("***.glb", d)).toBe("render_2026-09-29_1403");
  });
});

function fakeRenderer() {
  const state = { w: 390, h: 844, ratio: 3 };
  const renders: { aspect: number; ratio: number; view: THREE.PerspectiveCamera["view"] }[] = [];
  const camera = new THREE.PerspectiveCamera(70, 390 / 844, 0.1, 500);
  const gl = {
    domElement: document.createElement("canvas"),
    getSize: (v: THREE.Vector2) => v.set(state.w, state.h),
    getPixelRatio: () => state.ratio,
    setPixelRatio: vi.fn((r: number) => {
      state.ratio = r;
    }),
    setSize: vi.fn((w: number, h: number) => {
      state.w = w;
      state.h = h;
    }),
    render: vi.fn(() => {
      renders.push({
        aspect: camera.aspect,
        ratio: state.ratio,
        view: camera.view ? { ...camera.view } : null,
      });
    }),
  };
  return { gl, camera, state, renders };
}

describe("renderViewport", () => {
  it("renders 4K 16:9 as four view-offset tiles, then restores the viewer", () => {
    const { gl, camera, state, renders } = fakeRenderer();
    const out = renderViewport(gl as unknown as THREE.WebGLRenderer, new THREE.Scene(), camera);

    expect(out.width).toBe(CAPTURE_WIDTH);
    expect(out.height).toBe(CAPTURE_HEIGHT);
    expect(CAPTURE_WIDTH / CAPTURE_HEIGHT).toBeCloseTo(16 / 9);

    // Four tile renders plus one repaint of the live view.
    expect(renders).toHaveLength(5);
    const tiles = renders.slice(0, 4);
    for (const r of tiles) {
      expect(r.aspect).toBeCloseTo(16 / 9);
      expect(r.ratio).toBe(1);
      expect(r.view).toMatchObject({ enabled: true, fullWidth: 3840, fullHeight: 2160 });
    }
    expect(tiles.map((r) => [r.view!.offsetX, r.view!.offsetY])).toEqual([
      [0, 0],
      [1920, 0],
      [0, 1080],
      [1920, 1080],
    ]);
    expect(gl.setSize).toHaveBeenCalledWith(1920, 1080, false);

    // Each tile lands in its own quarter of the output.
    expect(drawImage.mock.calls.map((c) => c.slice(5))).toEqual([
      [0, 0, 1920, 1080],
      [1920, 0, 1920, 1080],
      [0, 1080, 1920, 1080],
      [1920, 1080, 1920, 1080],
    ]);

    // The on-screen viewer is back exactly as it was.
    expect(state).toEqual({ w: 390, h: 844, ratio: 3 });
    expect(camera.aspect).toBeCloseTo(390 / 844);
    expect(camera.view?.enabled ?? false).toBe(false);
    expect(renders[4].view?.enabled ?? false).toBe(false);
  });

  it("restores the viewer even if a render throws", () => {
    const { gl, camera, state } = fakeRenderer();
    gl.render.mockImplementationOnce(() => {
      throw new Error("context lost");
    });
    expect(() =>
      renderViewport(gl as unknown as THREE.WebGLRenderer, new THREE.Scene(), camera),
    ).toThrow("context lost");
    expect(state).toEqual({ w: 390, h: 844, ratio: 3 });
    expect(camera.view?.enabled ?? false).toBe(false);
  });
});

describe("canvasToJpeg", () => {
  it("encodes a high-quality JPEG", async () => {
    const toBlob = vi.fn((cb: BlobCallback, type?: string) => cb(new Blob(["x"], { type })));
    const blob = await canvasToJpeg({ toBlob } as unknown as HTMLCanvasElement);
    expect(blob.type).toBe("image/jpeg");
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", JPEG_QUALITY);
    expect(JPEG_QUALITY).toBeGreaterThanOrEqual(0.9);
  });

  it("rejects when encoding fails", async () => {
    const toBlob = (cb: BlobCallback) => cb(null);
    await expect(canvasToJpeg({ toBlob } as unknown as HTMLCanvasElement)).rejects.toThrow();
  });
});

describe("saving", () => {
  it("falls back to a normal download without the File System Access API", async () => {
    expect(await chooseSaveTarget("a.jpg")).toEqual({ kind: "download" });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await saveBlob(new Blob(["x"]), "a.jpg", { kind: "download" });
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe("a.jpg");
    expect(anchor.href).toBe("blob:capture");
    expect(anchor.isConnected).toBe(false);
  });

  it("uses the Save-as dialog when available and writes through it", async () => {
    const write = vi.fn();
    const close = vi.fn();
    const handle = { createWritable: vi.fn(async () => ({ write, close })) };
    const picker = vi.fn(async () => handle);
    vi.stubGlobal("showSaveFilePicker", picker);

    const target = await chooseSaveTarget("shot.jpg");
    expect(picker).toHaveBeenCalledWith(expect.objectContaining({ suggestedName: "shot.jpg" }));
    expect(target).toEqual({ kind: "picker", handle });

    const blob = new Blob(["x"]);
    await saveBlob(blob, "shot.jpg", target!);
    expect(write).toHaveBeenCalledWith(blob);
    expect(close).toHaveBeenCalled();
  });

  it("returns null when the user cancels the dialog", async () => {
    vi.stubGlobal(
      "showSaveFilePicker",
      vi.fn(async () => {
        throw new DOMException("cancelled", "AbortError");
      }),
    );
    expect(await chooseSaveTarget("a.jpg")).toBeNull();
  });
});

describe("showPrintPage", () => {
  function fakeWindow() {
    const doc = document.implementation.createHTMLDocument("");
    const listeners: Record<string, () => void> = {};
    return {
      doc,
      listeners,
      win: {
        document: doc,
        focus: vi.fn(),
        print: vi.fn(),
        addEventListener: (type: string, fn: () => void) => {
          listeners[type] = fn;
        },
      },
    };
  }

  it("builds a landscape page and prints once the image has loaded", () => {
    const { doc, win } = fakeWindow();
    showPrintPage(win as unknown as Window, "blob:img", "White Production · stage.glb", "stage");
    expect(doc.title).toBe("stage");
    expect(doc.head.textContent).toContain("size: landscape");
    const img = doc.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("blob:img");
    expect(win.print).not.toHaveBeenCalled();
    img.dispatchEvent(new Event("load"));
    expect(win.print).toHaveBeenCalled();
  });

  it("never interprets the caption as markup", () => {
    const { doc, win } = fakeWindow();
    showPrintPage(win as unknown as Window, "blob:img", "<img src=x onerror=alert(1)>", "t");
    expect(doc.querySelectorAll("img")).toHaveLength(1);
    expect(doc.querySelector("p")!.textContent).toBe("<img src=x onerror=alert(1)>");
  });

  it("releases the image when the print tab closes", () => {
    const { win, listeners } = fakeWindow();
    showPrintPage(win as unknown as Window, "blob:img", "c", "t");
    listeners.pagehide();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:img");
  });
});
