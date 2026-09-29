import { describe, expect, it } from "vitest";
import {
  FILE_TYPE_LABELS,
  FILE_TYPE_ORDER,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_LABEL,
  detectFileType,
  formatBytes,
  formatGigabytes,
  hdriUrlExtension,
  resolveS3Key,
  s3KeyFor,
  verifyHdriMagicBytes,
  verifyMagicBytes,
} from "@/lib/files";

const bytes = (...b: number[]) => Buffer.from([...b, ...new Array(16).fill(0)]);
const text = (s: string) => Buffer.from(s.padEnd(32, " "), "latin1");

describe("detectFileType", () => {
  it.each([
    ["plan.pdf", "PDF"],
    ["PHOTO.JPG", "IMAGE"],
    ["render.jpeg", "IMAGE"],
    ["shot.png", "IMAGE"],
    ["a.webp", "IMAGE"],
    ["a.gif", "IMAGE"],
    ["a.avif", "IMAGE"],
    ["stage.glb", "MODEL"],
    ["stage.gltf", "MODEL"],
    ["patch.csv", "CSV"],
    ["rig.mvr", "MVR"],
    ["notes.txt", "OTHER"],
    ["no-extension", "OTHER"],
    ["sky.hdr", "OTHER"],
  ])("%s -> %s", (name, type) => {
    expect(detectFileType(name)).toBe(type);
  });
});

describe("verifyMagicBytes", () => {
  it("accepts matching signatures", () => {
    expect(verifyMagicBytes("PDF", "a.pdf", text("%PDF-1.7"))).toBe(true);
    expect(
      verifyMagicBytes("IMAGE", "a.png", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe(true);
    expect(verifyMagicBytes("IMAGE", "a.jpg", bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(true);
    expect(verifyMagicBytes("IMAGE", "a.jpeg", bytes(0xff, 0xd8, 0xff, 0xdb))).toBe(true);
    expect(verifyMagicBytes("IMAGE", "a.gif", text("GIF89a"))).toBe(true);
    expect(verifyMagicBytes("IMAGE", "a.gif", text("GIF87a"))).toBe(true);
    expect(verifyMagicBytes("IMAGE", "a.webp", text("RIFF\0\0\0\0WEBPVP8 "))).toBe(true);
    expect(verifyMagicBytes("IMAGE", "a.avif", text("\0\0\0\x1cftypavif"))).toBe(true);
    expect(verifyMagicBytes("MODEL", "a.glb", text("glTF"))).toBe(true);
    expect(verifyMagicBytes("MVR", "a.mvr", bytes(0x50, 0x4b, 0x03, 0x04))).toBe(true);
    expect(verifyMagicBytes("MVR", "a.mvr", bytes(0x50, 0x4b, 0x05, 0x06))).toBe(true);
  });

  it("rejects a renamed file (e.g. a zip saved as .glb)", () => {
    expect(verifyMagicBytes("MODEL", "bomb.glb", bytes(0x50, 0x4b, 0x03, 0x04))).toBe(false);
    expect(verifyMagicBytes("PDF", "a.pdf", text("<html>"))).toBe(false);
    expect(verifyMagicBytes("IMAGE", "a.png", bytes(0xff, 0xd8, 0xff))).toBe(false);
    expect(verifyMagicBytes("IMAGE", "a.webp", text("RIFF\0\0\0\0WAVE"))).toBe(false);
    expect(verifyMagicBytes("MVR", "a.mvr", text("not a zip"))).toBe(false);
  });

  it("passes types with no reliable signature", () => {
    expect(verifyMagicBytes("CSV", "a.csv", text("a,b,c"))).toBe(true);
    expect(verifyMagicBytes("MODEL", "a.gltf", text('{"asset":{}}'))).toBe(true);
    expect(verifyMagicBytes("OTHER", "a.bin", bytes(1, 2, 3))).toBe(true);
  });
});

describe("HDRI helpers", () => {
  it("recognises Radiance and OpenEXR headers", () => {
    expect(verifyHdriMagicBytes("sky.hdr", text("#?RADIANCE\nFORMAT"))).toBe(true);
    expect(verifyHdriMagicBytes("sky.hdri", text("#?RGBE\n"))).toBe(true);
    expect(verifyHdriMagicBytes("sky.exr", bytes(0x76, 0x2f, 0x31, 0x01))).toBe(true);
  });

  it("rejects mismatched content", () => {
    expect(verifyHdriMagicBytes("sky.hdr", bytes(0x76, 0x2f, 0x31, 0x01))).toBe(false);
    expect(verifyHdriMagicBytes("sky.exr", text("#?RADIANCE"))).toBe(false);
    expect(verifyHdriMagicBytes("sky.hdr", bytes(0xff, 0xd8, 0xff))).toBe(false);
  });

  it("maps every extension to one drei can load", () => {
    expect(hdriUrlExtension("a.exr")).toBe("exr");
    expect(hdriUrlExtension("A.EXR")).toBe("exr");
    expect(hdriUrlExtension("a.hdr")).toBe("hdr");
    expect(hdriUrlExtension("a.hdri")).toBe("hdr");
    expect(hdriUrlExtension("noext")).toBe("hdr");
  });
});

describe("storage keys", () => {
  it("builds a per-version key and sanitises the filename", () => {
    const key = s3KeyFor("p1", "v1", "Main stage (final)?.glb");
    expect(key).toMatch(/^projects\/p1\/v1\/[0-9a-f-]{36}-Main stage _final__\.glb$/);
    expect(s3KeyFor("p1", "v1", "a.glb")).not.toBe(s3KeyFor("p1", "v1", "a.glb"));
  });

  it("strips the clone suffix back to the real object key", () => {
    expect(resolveS3Key("projects/p/v/x.glb")).toBe("projects/p/v/x.glb");
    expect(resolveS3Key("projects/p/v/x.glb#v2")).toBe("projects/p/v/x.glb");
    expect(resolveS3Key("projects/p/v/x.glb#v2#v3")).toBe("projects/p/v/x.glb");
  });
});

describe("formatting", () => {
  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatGigabytes(1.5 * 1024 ** 3)).toBe("1.50 GB");
  });

  it("labels the upload cap from the constant", () => {
    expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
    expect(MAX_FILE_SIZE_LABEL).toBe("50 MB");
  });

  it("has a label for every file-type group it displays", () => {
    for (const type of FILE_TYPE_ORDER) expect(FILE_TYPE_LABELS[type]).toBeTruthy();
  });
});
