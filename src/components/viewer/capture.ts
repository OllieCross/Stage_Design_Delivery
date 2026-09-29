import * as THREE from "three";

/**
 * Client-side 4K capture of the tour viewport, for the viewer menu's Render
 * (JPEG download) and Print (browser print dialog) actions. Everything here
 * runs in the browser on the viewer's own WebGL context - the server only
 * ever served the model.
 */

export const CAPTURE_WIDTH = 3840;
export const CAPTURE_HEIGHT = 2160;
export const JPEG_QUALITY = 0.95;

export type Tile = { x: number; y: number; w: number; h: number };

/**
 * Splits a width x height image into a cols x rows grid of tiles. The last
 * column/row absorbs any remainder so the tiles always cover every pixel
 * exactly once.
 */
export function tileLayout(width: number, height: number, cols: number, rows: number): Tile[] {
  const baseW = Math.floor(width / cols);
  const baseH = Math.floor(height / rows);
  const tiles: Tile[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * baseW;
      const y = row * baseH;
      tiles.push({
        x,
        y,
        w: col === cols - 1 ? width - x : baseW,
        h: row === rows - 1 ? height - y : baseH,
      });
    }
  }
  return tiles;
}

/** "Main Stage.glb" + date -> "main-stage_2026-09-29_1403". */
export function captureBaseName(name: string, date: Date) {
  const stem =
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "render";
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}`;
  return `${stem}_${stamp}`;
}

/**
 * Renders the current camera view at width x height (16:9 by default) into a
 * 2D canvas. The WebGL drawing buffer is never enlarged past one tile: the
 * frame is rendered as a 2x2 grid of camera view offsets, each 1920x1080,
 * which stays inside every GPU's maximum renderbuffer size (phones included)
 * while still producing a seamless full-resolution image.
 *
 * Everything happens synchronously inside one task, so each tile is copied
 * out of the drawing buffer before the browser could clear it - no
 * preserveDrawingBuffer needed - and the viewer's own size, pixel ratio and
 * aspect are restored before the next frame.
 */
export function renderViewport(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width = CAPTURE_WIDTH,
  height = CAPTURE_HEIGHT,
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Could not create a 2D canvas for the capture");

  const tiles = tileLayout(width, height, 2, 2);
  const prevSize = gl.getSize(new THREE.Vector2());
  const prevRatio = gl.getPixelRatio();
  const prevAspect = camera.aspect;

  try {
    gl.setPixelRatio(1);
    camera.aspect = width / height;
    for (const t of tiles) {
      gl.setSize(t.w, t.h, false);
      camera.setViewOffset(width, height, t.x, t.y, t.w, t.h);
      gl.render(scene, camera);
      ctx.drawImage(gl.domElement, 0, 0, t.w, t.h, t.x, t.y, t.w, t.h);
    }
  } finally {
    camera.clearViewOffset();
    camera.aspect = prevAspect;
    camera.updateProjectionMatrix();
    gl.setPixelRatio(prevRatio);
    gl.setSize(prevSize.x, prevSize.y, false);
    // Resizing cleared the visible canvas; repaint it now rather than
    // flashing black until the next animation frame.
    gl.render(scene, camera);
  }
  return out;
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality = JPEG_QUALITY): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("JPEG encoding failed"))),
      "image/jpeg",
      quality,
    ),
  );
}

type SaveFilePicker = (options: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<{
  createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }>;
}>;

export type SaveTarget =
  { kind: "picker"; handle: Awaited<ReturnType<SaveFilePicker>> } | { kind: "download" };

/**
 * Asks where to save before anything is rendered. Browsers with the File
 * System Access API (Chrome, Edge) show a real "Save as" dialog; the call has
 * to happen while the click's user activation is still live, which is why
 * this runs first. Everywhere else the file goes through the browser's normal
 * download flow, which asks for a location or not per the user's own browser
 * setting. Returns null if the user cancelled the dialog.
 */
export async function chooseSaveTarget(suggestedName: string): Promise<SaveTarget | null> {
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (typeof picker !== "function") return { kind: "download" };
  try {
    const handle = await picker({
      suggestedName,
      types: [{ description: "JPEG image", accept: { "image/jpeg": [".jpg", ".jpeg"] } }],
    });
    return { kind: "picker", handle };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;
    // Picker unavailable in this context (e.g. cross-origin iframe): fall back.
    return { kind: "download" };
  }
}

export async function saveBlob(blob: Blob, filename: string, target: SaveTarget) {
  if (target.kind === "picker") {
    const writable = await target.handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the download a moment to start before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Fills a tab opened (synchronously, on the click) with window.open("") with a
 * single landscape page holding the image and a caption, then opens the
 * browser's print dialog - printer choice, paper, and "Save as PDF" all come
 * from there. Built with DOM APIs rather than document.write, so the caption
 * text can never be interpreted as markup.
 */
export function showPrintPage(win: Window, imageUrl: string, caption: string, title: string) {
  const doc = win.document;
  doc.title = title;

  const style = doc.createElement("style");
  style.textContent = `
    @page { size: landscape; margin: 10mm; }
    html, body { margin: 0; background: #fff; color: #444; }
    body { font: 10px "Helvetica Neue", Helvetica, Arial, sans-serif; padding: 10mm; }
    img { display: block; width: 100%; height: auto; }
    p { margin: 3mm 0 0; letter-spacing: 0.08em; text-transform: uppercase; }
    @media print { body { padding: 0; } }
  `;
  doc.head.appendChild(style);

  const img = doc.createElement("img");
  img.alt = caption;
  const p = doc.createElement("p");
  p.textContent = caption;
  doc.body.replaceChildren(img, p);

  img.addEventListener("load", () => {
    win.focus();
    win.print();
  });
  win.addEventListener("pagehide", () => URL.revokeObjectURL(imageUrl));
  img.src = imageUrl;
}
