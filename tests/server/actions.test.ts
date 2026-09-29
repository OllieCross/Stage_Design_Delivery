import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetMocks, s3 } from "../mocks";

vi.mock("@/lib/db", async () => ({ db: (await import("../mocks")).db }));
vi.mock("@/lib/s3", async () => (await import("../mocks")).s3);
vi.mock("@/lib/session", () => ({ isAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Next's redirect() throws to abort rendering; mirror that so code after it
// can't run unnoticed.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${url}`), { url });
  }),
}));

const { isAdmin } = await import("@/lib/session");
const { revalidatePath } = await import("next/cache");
const actions = await import("@/server/actions");

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

beforeEach(() => {
  resetMocks();
  vi.mocked(isAdmin).mockResolvedValue(true);
});

describe("admin guard", () => {
  it("every mutating action refuses a non-admin", async () => {
    vi.mocked(isAdmin).mockResolvedValue(false);
    const calls = [
      actions.createProject(form({ name: "X" })),
      actions.updateProject(form({ id: "p", name: "X", slug: "x" })),
      actions.trashProject(form({ id: "p" })),
      actions.restoreProject(form({ id: "p" })),
      actions.createVersion(form({ projectId: "p" })),
      actions.deleteVersion(form({ id: "v" })),
      actions.deleteFile(form({ id: "f" })),
      actions.deleteHdriAsset(form({ variant: "DAY" })),
      actions.createPreset(form({ fileId: "f" })),
      actions.deletePreset(form({ id: "c" })),
    ];
    for (const call of calls) await expect(call).rejects.toThrow("Unauthorized");
    expect(db.project.create).not.toHaveBeenCalled();
    expect(s3.deleteObject).not.toHaveBeenCalled();
  });
});

describe("projects", () => {
  it("creates a project with a slug derived from the name, then opens its editor", async () => {
    db.project.create.mockResolvedValue({ id: "p1" });
    await expect(actions.createProject(form({ name: "Hype Culture Vol. 5!" }))).rejects.toThrow(
      "NEXT_REDIRECT /edit/projects/p1",
    );
    expect(db.project.create).toHaveBeenCalledWith({
      data: {
        name: "Hype Culture Vol. 5!",
        slug: "hype-culture-vol-5",
        versions: { create: { label: "v1" } },
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/edit");
  });

  it("rejects a project with no usable name", async () => {
    await expect(actions.createProject(form({ name: "   " }))).rejects.toThrow(/Invalid/);
    await expect(actions.createProject(form({ name: "!!!" }))).rejects.toThrow(/Invalid/);
  });

  it("refuses a slug another project already uses", async () => {
    db.project.findFirst.mockResolvedValue({ id: "other" });
    await expect(
      actions.updateProject(form({ id: "p1", name: "A", slug: "taken" })),
    ).rejects.toThrow(/already uses/);
    expect(db.project.update).not.toHaveBeenCalled();
  });

  it("stores event dates at midnight UTC and parses the hidden checkbox", async () => {
    db.project.findFirst.mockResolvedValue(null);
    await actions.updateProject(
      form({ id: "p1", name: "A", slug: "a", eventDate: "2026-10-03", hidden: "on" }),
    );
    expect(db.project.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { name: "A", slug: "a", hidden: true, eventDate: new Date("2026-10-03T00:00:00Z") },
    });
  });

  it("trashing sends the admin back to the dashboard", async () => {
    await expect(actions.trashProject(form({ id: "p1" }))).rejects.toThrow("NEXT_REDIRECT /edit");
    expect(db.project.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { deletedAt: expect.any(Date) },
    });
  });
});

describe("versions", () => {
  it("numbers an unlabelled version after the existing ones", async () => {
    db.version.count.mockResolvedValue(2);
    db.version.create.mockResolvedValue({ id: "v3" });
    await actions.createVersion(form({ projectId: "p1" }));
    expect(db.version.create).toHaveBeenCalledWith({ data: { projectId: "p1", label: "v3" } });
  });

  it("clones files by sharing their objects under a #version suffix", async () => {
    db.version.create.mockResolvedValue({ id: "v2" });
    db.file.findMany.mockResolvedValue([
      { type: "PDF", name: "a.pdf", s3Key: "projects/p1/v1/a.pdf", size: 10, contentType: "x" },
    ]);
    await actions.createVersion(form({ projectId: "p1", label: "v2", cloneFrom: "v1" }));
    expect(db.file.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ versionId: "v2", s3Key: "projects/p1/v1/a.pdf#v2" }),
    });
    expect(s3.putObject).not.toHaveBeenCalled();
  });
});

describe("file deletion keeps shared objects alive", () => {
  beforeEach(() => {
    db.file.findUnique.mockResolvedValue({
      id: "f1",
      s3Key: "projects/p1/v1/a.pdf",
      version: { projectId: "p1" },
    });
  });

  it("keeps the object while a clone still references it", async () => {
    db.file.count.mockResolvedValue(1);
    await actions.deleteFile(form({ id: "f1" }));
    expect(s3.deleteObject).not.toHaveBeenCalled();
    expect(db.file.delete).toHaveBeenCalledWith({ where: { id: "f1" } });
  });

  it("deletes the object and its cached thumbnail once unreferenced", async () => {
    db.file.count.mockResolvedValue(0);
    await actions.deleteFile(form({ id: "f1" }));
    expect(s3.deleteObject).toHaveBeenCalledWith("projects/p1/v1/a.pdf");
    expect(s3.deleteObject).toHaveBeenCalledWith("thumb/projects/p1/v1/a.pdf.webp");
  });

  it("counts references on an exact or #-boundary match only", async () => {
    db.file.count.mockResolvedValue(0);
    await actions.deleteFile(form({ id: "f1" }));
    expect(db.file.count).toHaveBeenCalledWith({
      where: {
        id: { not: "f1" },
        OR: [{ s3Key: "projects/p1/v1/a.pdf" }, { s3Key: { startsWith: "projects/p1/v1/a.pdf#" } }],
      },
    });
  });
});

describe("HDRI and presets", () => {
  it("ignores an invalid HDRI variant", async () => {
    await actions.deleteHdriAsset(form({ variant: "DUSK" }));
    expect(db.hdriAsset.findUnique).not.toHaveBeenCalled();
  });

  it("deletes a stored HDRI slot and its object", async () => {
    db.hdriAsset.findUnique.mockResolvedValue({ variant: "DAY", s3Key: "env/day.hdr" });
    await actions.deleteHdriAsset(form({ variant: "DAY" }));
    expect(s3.deleteObject).toHaveBeenCalledWith("env/day.hdr");
    expect(db.hdriAsset.delete).toHaveBeenCalledWith({ where: { variant: "DAY" } });
  });

  it("only adds camera presets to 3D models, ordered last", async () => {
    db.file.findUnique.mockResolvedValue({ type: "PDF", presets: [], version: { projectId: "p" } });
    await expect(actions.createPreset(form({ fileId: "f" }))).rejects.toThrow(/3D models/);

    db.file.findUnique.mockResolvedValue({
      type: "MODEL",
      presets: [{}, {}],
      version: { projectId: "p" },
    });
    await actions.createPreset(form({ fileId: "f", name: "FOH", x: "1.5", y: "abc", yaw: "90" }));
    expect(db.cameraPreset.create).toHaveBeenCalledWith({
      data: { fileId: "f", name: "FOH", x: 1.5, y: 0, z: 0, yaw: 90, pitch: 0, order: 2 },
    });
  });
});
