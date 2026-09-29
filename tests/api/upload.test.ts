import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, formRequest, resetMocks, s3 } from "../mocks";

vi.mock("@/lib/db", async () => ({ db: (await import("../mocks")).db }));
vi.mock("@/lib/s3", async () => (await import("../mocks")).s3);
vi.mock("@/lib/session", () => ({ isAdmin: vi.fn() }));

const { isAdmin } = await import("@/lib/session");
const { POST } = await import("@/app/api/admin/upload/route");

let n = 0;
const ip = () => `10.1.${Math.floor(++n / 250)}.${n % 250}`;
const URL_ = "http://localhost/api/admin/upload";
const pdf = (name = "plan.pdf", size = 0) =>
  new File([Buffer.from("%PDF-1.7 " + "x".repeat(size))], name, { type: "application/pdf" });

beforeEach(() => {
  resetMocks();
  vi.mocked(isAdmin).mockResolvedValue(true);
  db.version.findUnique.mockResolvedValue({ id: "v1", projectId: "p1" });
  db.file.create.mockImplementation(async ({ data }) => ({ id: "f1", ...data }));
});

describe("POST /api/admin/upload", () => {
  it("rejects anyone who isn't the admin", async () => {
    vi.mocked(isAdmin).mockResolvedValue(false);
    const res = await POST(formRequest(URL_, { versionId: "v1", file: pdf() }, ip()));
    expect(res.status).toBe(401);
    expect(s3.putObject).not.toHaveBeenCalled();
  });

  it("requires a version id and a file", async () => {
    const res = await POST(formRequest(URL_, { versionId: "v1" }, ip()));
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown version", async () => {
    db.version.findUnique.mockResolvedValue(null);
    const res = await POST(formRequest(URL_, { versionId: "nope", file: pdf() }, ip()));
    expect(res.status).toBe(404);
  });

  it("rejects content that doesn't match the extension", async () => {
    const fake = new File([Buffer.from("PK\x03\x04 zip bomb")], "stage.glb");
    const res = await POST(formRequest(URL_, { versionId: "v1", file: fake }, ip()));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/doesn't match/);
    expect(s3.putObject).not.toHaveBeenCalled();
  });

  it("stores a valid file and records it", async () => {
    const res = await POST(formRequest(URL_, { versionId: "v1", file: pdf() }, ip()));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "f1", name: "plan.pdf", type: "PDF" });
    const [key, , contentType] = s3.putObject.mock.calls[0];
    expect(key).toMatch(/^projects\/p1\/v1\/.+-plan\.pdf$/);
    expect(contentType).toBe("application/pdf");
    expect(db.file.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ versionId: "v1", type: "PDF", s3Key: key }),
    });
  });

  it("does not fail the upload when an MVR can't be parsed", async () => {
    const mvr = new File([Buffer.from("PK\x03\x04garbage")], "rig.mvr");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(formRequest(URL_, { versionId: "v1", file: mvr }, ip()));
    expect(res.status).toBe(200);
    expect((await res.json()).fixtureCount).toBe(0);
    expect(errors).toHaveBeenCalled();
    expect(db.fixture.createMany).not.toHaveBeenCalled();
  });

  it("rate-limits one client at 60 uploads a minute", async () => {
    const same = ip();
    for (let i = 0; i < 60; i++) {
      expect((await POST(formRequest(URL_, { versionId: "v1", file: pdf() }, same))).status).toBe(
        200,
      );
    }
    const res = await POST(formRequest(URL_, { versionId: "v1", file: pdf() }, same));
    expect(res.status).toBe(429);
  });
});
