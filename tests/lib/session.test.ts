import { describe, expect, it } from "vitest";

const session = await import("@/lib/session");

describe("admin access", () => {
  it("treats every visitor as the admin (the site has no authentication)", async () => {
    expect(await session.isAdmin()).toBe(true);
  });
});
