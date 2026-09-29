import { Readable } from "node:stream";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, formRequest, resetMocks, s3 } from "../mocks";

vi.mock("@/lib/db", async () => ({ db: (await import("../mocks")).db }));
vi.mock("@/lib/s3", async () => (await import("../mocks")).s3);
vi.mock("@/lib/session", () => ({ isAdmin: vi.fn() }));

const { isAdmin } = await import("@/lib/session");
const upload = await import("@/app/api/admin/upload-hdri/route");
const serve = await import("@/app/api/hdri/[variant]/[filename]/route");

let n = 0;
const ip = () => `10.2.0.${++n}`;
const URL_ = "http://localhost/api/admin/upload-hdri";
const hdr = (name = "sky.hdr") => new File([Buffer.from("#?RADIANCE\nFORMAT=32-bit")], name);
const exr = (name = "sky.exr") => new File([Buffer.from([0x76, 0x2f, 0x31, 0x01, 0, 0])], name);

beforeEach(() => {
  resetMocks();
  vi.mocked(isAdmin).mockResolvedValue(true);
  db.hdriAsset.findUnique.mockResolvedValue(null);
});

describe("POST /api/admin/upload-hdri", () => {
  it("is admin-only", async () => {
    vi.mocked(isAdmin).mockResolvedValue(false);
    const res = await upload.POST(formRequest(URL_, { variant: "DAY", file: hdr() }, ip()));
    expect(res.status).toBe(401);
  });

  it("requires a DAY or NIGHT variant", async () => {
    const res = await upload.POST(formRequest(URL_, { variant: "DUSK", file: hdr() }, ip()));
    expect(res.status).toBe(400);
  });

  it("rejects files that aren't Radiance or OpenEXR", async () => {
    const jpg = new File([Buffer.from([0xff, 0xd8, 0xff])], "sky.hdr");
    const res = await upload.POST(formRequest(URL_, { variant: "DAY", file: jpg }, ip()));
    expect(res.status).toBe(400);
    expect(s3.putObject).not.toHaveBeenCalled();
  });

  it("stores the slot at a fixed key and upserts it", async () => {
    const res = await upload.POST(formRequest(URL_, { variant: "NIGHT", file: hdr() }, ip()));
    expect(res.status).toBe(200);
    expect(s3.putObject.mock.calls[0][0]).toBe("env/night.hdr");
    expect(db.hdriAsset.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { variant: "NIGHT" } }),
    );
    expect(s3.deleteObject).not.toHaveBeenCalled();
  });

  it("deletes the old object when a slot is replaced in another format", async () => {
    db.hdriAsset.findUnique.mockResolvedValue({ variant: "DAY", s3Key: "env/day.hdr" });
    const res = await upload.POST(formRequest(URL_, { variant: "DAY", file: exr() }, ip()));
    expect(res.status).toBe(200);
    expect(s3.putObject.mock.calls[0][0]).toBe("env/day.exr");
    expect(s3.deleteObject).toHaveBeenCalledWith("env/day.hdr");
  });
});

describe("GET /api/hdri/[variant]/[filename]", () => {
  const get = (variant: string) =>
    serve.GET(new NextRequest(`http://localhost/api/hdri/${variant}/env.hdr`), {
      params: Promise.resolve({ variant, filename: "env.hdr" }),
    });

  it("404s an unknown variant", async () => {
    expect((await get("dusk")).status).toBe(404);
    expect(db.hdriAsset.findUnique).not.toHaveBeenCalled();
  });

  it("404s an empty slot", async () => {
    expect((await get("day")).status).toBe(404);
  });

  it("streams the stored file publicly cacheable", async () => {
    db.hdriAsset.findUnique.mockResolvedValue({
      variant: "DAY",
      s3Key: "env/day.hdr",
      size: 5,
      contentType: "image/vnd.radiance",
    });
    s3.getObjectStream.mockResolvedValue(Readable.from([Buffer.from("hello")]));
    const res = await get("day");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(res.headers.get("content-type")).toBe("image/vnd.radiance");
    expect(await res.text()).toBe("hello");
    expect(db.hdriAsset.findUnique).toHaveBeenCalledWith({ where: { variant: "DAY" } });
  });
});
