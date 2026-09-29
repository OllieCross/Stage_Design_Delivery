import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetMocks, s3 } from "../mocks";

vi.mock("@/lib/db", async () => ({ db: (await import("../mocks")).db }));
vi.mock("@/lib/s3", async () => (await import("../mocks")).s3);
vi.mock("@/lib/session", () => ({ isAdmin: vi.fn() }));

const { isAdmin } = await import("@/lib/session");
const { serveFile } = await import("@/server/serve-file");
const { totalStorageBytes } = await import("@/server/storage");
const { purgeExpiredTrash } = await import("@/server/purge");

const file = (project: { deletedAt?: Date | null; hidden?: boolean } = {}) => ({
  id: "f1",
  name: "Plan v2.pdf",
  s3Key: "projects/p/v2/x.pdf#v2",
  size: 3,
  contentType: "application/pdf",
  version: { project: { deletedAt: null, hidden: false, ...project } },
});

beforeEach(() => {
  resetMocks();
  vi.mocked(isAdmin).mockResolvedValue(false);
  s3.getObjectStream.mockImplementation(async () => Readable.from([Buffer.from("pdf")]));
});

describe("serveFile", () => {
  it("404s a missing file or a trashed project", async () => {
    db.file.findUnique.mockResolvedValue(null);
    expect((await serveFile("x", "inline")).status).toBe(404);
    db.file.findUnique.mockResolvedValue(file({ deletedAt: new Date() }));
    expect((await serveFile("f1", "inline")).status).toBe(404);
  });

  it("hides files of a hidden project from everyone but the admin", async () => {
    db.file.findUnique.mockResolvedValue(file({ hidden: true }));
    expect((await serveFile("f1", "inline")).status).toBe(404);
    vi.mocked(isAdmin).mockResolvedValue(true);
    expect((await serveFile("f1", "inline")).status).toBe(200);
  });

  it("streams the real object behind a cloned record with the right headers", async () => {
    db.file.findUnique.mockResolvedValue(file());
    const res = await serveFile("f1", "attachment");
    expect(s3.getObjectStream).toHaveBeenCalledWith("projects/p/v2/x.pdf");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="Plan%20v2.pdf"');
    expect(res.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(await res.text()).toBe("pdf");
  });
});

describe("totalStorageBytes", () => {
  it("counts each stored object once, however many versions share it", async () => {
    db.file.findMany.mockResolvedValue([
      { s3Key: "projects/p/v1/a.glb", size: 100 },
      { s3Key: "projects/p/v1/a.glb#v2", size: 100 },
      { s3Key: "projects/p/v1/a.glb#v3", size: 100 },
      { s3Key: "projects/p/v1/b.pdf", size: 5 },
    ]);
    expect(await totalStorageBytes()).toBe(105);
  });
});

describe("purgeExpiredTrash", () => {
  it("removes projects trashed over 7 days ago, including their thumbnails", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    db.project.findMany.mockResolvedValue([{ id: "p1", slug: "old" }]);
    expect(await purgeExpiredTrash()).toBe(1);
    const cutoff = db.project.findMany.mock.calls[0][0].where.deletedAt.lt as Date;
    expect(Date.now() - cutoff.getTime()).toBeGreaterThanOrEqual(7 * 24 * 3600 * 1000 - 1000);
    expect(s3.deletePrefix).toHaveBeenCalledWith("projects/p1/");
    expect(s3.deletePrefix).toHaveBeenCalledWith("thumb/projects/p1/");
    expect(db.project.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});
