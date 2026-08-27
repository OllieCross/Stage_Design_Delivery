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
