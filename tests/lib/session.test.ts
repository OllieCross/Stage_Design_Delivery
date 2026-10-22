import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

const session = await import("@/lib/session");

beforeEach(() => {
  jar.clear();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.stubEnv("SESSION_SECRET", "test-secret-value");
  vi.stubEnv("ADMIN_USER", "AdminUser");
  vi.stubEnv("ADMIN_PASSWORD", "correct horse");
});

describe("admin session", () => {
  it("is not admin without a cookie", async () => {
    expect(await session.isAdmin()).toBe(false);
  });

  it("creates a signed session that isAdmin accepts", async () => {
    await session.createSession();
    expect(await session.isAdmin()).toBe(true);
  });

  it("rejects a tampered payload", async () => {
    await session.createSession();
    const [, sig] = jar.get("session")!.split(".");
    const forged = Buffer.from(JSON.stringify({ admin: true, exp: Date.now() + 1e9 })).toString(
      "base64url",
    );
    jar.set("session", `${forged}.${sig}`);
    expect(await session.isAdmin()).toBe(false);
  });

  it("rejects garbage tokens", async () => {
    for (const token of ["", "abc", "a.b", "..."]) {
      jar.set("session", token);
      expect(await session.isAdmin()).toBe(false);
    }
  });

  it("expires after 30 days", async () => {
    vi.useFakeTimers();
    await session.createSession();
    vi.advanceTimersByTime(29 * 24 * 3600 * 1000);
    expect(await session.isAdmin()).toBe(true);
    vi.advanceTimersByTime(2 * 24 * 3600 * 1000);
    expect(await session.isAdmin()).toBe(false);
  });

  it("destroySession logs out", async () => {
    await session.createSession();
    await session.destroySession();
    expect(await session.isAdmin()).toBe(false);
  });

  it("fails closed when SESSION_SECRET is missing", async () => {
    await session.createSession();
    vi.stubEnv("SESSION_SECRET", "");
    expect(await session.isAdmin()).toBe(false);
  });
});

describe("checkCredentials", () => {
  it("accepts the configured username and password", () => {
    expect(session.checkCredentials("AdminUser", "correct horse")).toBe(true);
  });

  it("rejects a wrong username, wrong password, or both", () => {
    expect(session.checkCredentials("admin", "correct horse")).toBe(false);
    expect(session.checkCredentials("AdminUser", "wrong")).toBe(false);
    expect(session.checkCredentials("", "")).toBe(false);
  });

  it("fails closed when credentials are not configured", () => {
    vi.stubEnv("ADMIN_USER", "");
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(session.checkCredentials("", "")).toBe(false);
  });
});
