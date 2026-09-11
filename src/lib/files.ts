import type { FileType } from "@/generated/prisma/enums";

/** Upload size cap, shared by the client-side check and the upload route. */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_FILE_SIZE_LABEL = `${MAX_FILE_SIZE / 1024 / 1024} MB`;

const EXTENSION_TYPES: Record<string, FileType> = {
  pdf: "PDF",
  png: "IMAGE",
  jpg: "IMAGE",
  jpeg: "IMAGE",
  webp: "IMAGE",
  gif: "IMAGE",
  avif: "IMAGE",
  glb: "MODEL",
  gltf: "MODEL",
  csv: "CSV",
  mvr: "MVR",
};

export function detectFileType(filename: string): FileType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[ext] ?? "OTHER";
}

/**
 * Sniffs the first bytes against the signature expected for the declared
 * type, so a renamed file (e.g. a zip bomb saved as ".glb") is rejected
 * instead of accepted and later served back under a spoofed content type.
 * CSV, bare .gltf (JSON) and OTHER have no reliable signature and pass
 * unchecked - extension + size are all we have for those.
 */
const MAGIC_CHECKS: Partial<Record<FileType, (bytes: Buffer, ext: string) => boolean>> = {
  PDF: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
  IMAGE: (b, ext) => {
    if (ext === "png") {
      return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (ext === "jpg" || ext === "jpeg") {
      return b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    }
    if (ext === "gif") return /^GIF8[79]a/.test(b.subarray(0, 6).toString("latin1"));
    if (ext === "webp") {
      return (
        b.subarray(0, 4).toString("latin1") === "RIFF" &&
        b.subarray(8, 12).toString("latin1") === "WEBP"
      );
    }
    if (ext === "avif") return b.subarray(4, 12).toString("latin1").includes("ftyp");
    return true;
  },
  MODEL: (b, ext) => ext !== "glb" || b.subarray(0, 4).toString("latin1") === "glTF",
  // MVR is a zip archive (a local-file-header or empty-archive signature).
  MVR: (b) =>
    b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) ||
    b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x05, 0x06])),
};

export function verifyMagicBytes(type: FileType, filename: string, bytes: Buffer): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const check = MAGIC_CHECKS[type];
  return check ? check(bytes, ext) : true;
}

/**
 * HDRI is global (HdriAsset), not a per-version FileType, so it gets its own
 * signature check rather than a MAGIC_CHECKS entry: Radiance HDR
 * ("#?RADIANCE" / "#?RGBE") or OpenEXR (magic 76 2f 31 01).
 */
export function verifyHdriMagicBytes(filename: string, bytes: Buffer): boolean {
  if (hdriUrlExtension(filename) === "exr") {
    return bytes.subarray(0, 4).equals(Buffer.from([0x76, 0x2f, 0x31, 0x01]));
  }
  return /^#\?(RADIANCE|RGBE)/.test(bytes.subarray(0, 11).toString("latin1"));
}

/** drei's HDRI loader only recognizes "hdr" or "exr"; ".hdri" is Radiance too. */
export function hdriUrlExtension(filename: string): "hdr" | "exr" {
  return filename.split(".").pop()?.toLowerCase() === "exr" ? "exr" : "hdr";
}

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  MODEL: "3D Models",
  PDF: "PDFs",
  IMAGE: "Images",
  CSV: "Tables",
  MVR: "Lighting Scenes",
  OTHER: "Other",
};

/** Display order of file-type groups on project pages. */
export const FILE_TYPE_ORDER: FileType[] = ["MODEL", "PDF", "IMAGE", "CSV", "MVR", "OTHER"];

export function s3KeyFor(projectId: string, versionId: string, filename: string) {
  const safe = filename.replace(/[^\w.\- ]/g, "_");
  return `projects/${projectId}/${versionId}/${crypto.randomUUID()}-${safe}`;
}

/** Cloned file records carry a `#versionId` suffix; the real object key precedes it. */
export function resolveS3Key(s3Key: string) {
  return s3Key.split("#")[0];
}

export function formatGigabytes(bytes: number) {
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
