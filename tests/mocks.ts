import { NextRequest } from "next/server";
import { vi } from "vitest";

/**
 * Shared stand-ins for the Prisma client and object storage, so route
 * handlers and server actions can be exercised without Postgres or MinIO.
 * Each test file wires these in with vi.mock(...) and resets them in
 * beforeEach.
 */

const model = () => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  createMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
});

export const db = {
  project: model(),
  version: model(),
  file: model(),
  fixture: model(),
  cameraPreset: model(),
  credential: model(),
  hdriAsset: model(),
  $transaction: vi.fn(),
};

export const s3 = {
  putObject:
    vi.fn<(key: string, body: Buffer | Uint8Array, contentType: string) => Promise<void>>(),
  getObjectStream: vi.fn(),
  tryGetObject: vi.fn(),
  deleteObject: vi.fn<(key: string) => Promise<void>>(),
  deletePrefix: vi.fn<(prefix: string) => Promise<void>>(),
  presignUpload: vi.fn(),
  presignDownload: vi.fn(),
};

export function resetMocks() {
  for (const m of Object.values(db)) {
    if (typeof m === "function") m.mockReset();
    else for (const fn of Object.values(m)) fn.mockReset();
  }
  s3.putObject.mockReset().mockResolvedValue(undefined);
  s3.deleteObject.mockReset().mockResolvedValue(undefined);
  s3.deletePrefix.mockReset().mockResolvedValue(undefined);
  s3.getObjectStream.mockReset();
  s3.tryGetObject.mockReset();
}

/** An in-memory stand-in for next/headers' cookies() store. */
export function cookieJar() {
  const jar = new Map<string, string>();
  const store = {
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  };
  return { jar, cookies: async () => store };
}

/** Multipart POST as a browser upload would send it. */
export function formRequest(url: string, fields: Record<string, string | File>, ip = "10.0.0.1") {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  return new NextRequest(url, { method: "POST", body, headers: { "x-forwarded-for": ip } });
}
