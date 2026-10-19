import { describe, expect, it, vi } from "vitest";
import { db } from "../mocks";

vi.mock("@/lib/db", async () => ({ db: (await import("../mocks")).db }));

const health = await import("@/app/api/health/route");

describe("health", () => {
  it("answers without touching the database", async () => {
    const res = await health.GET();
    expect(await res.json()).toEqual({ ok: true });
    expect(db.project.findMany).not.toHaveBeenCalled();
  });
});
