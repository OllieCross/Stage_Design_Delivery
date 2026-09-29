import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar } from "../mocks";

const { jar, cookies } = cookieJar();
vi.mock("next/headers", () => ({ cookies: () => cookies() }));

const session = await import("@/lib/session");

beforeEach(() => {
  jar.clear();
  vi.useRealTimers();
});

describe("admin session", () => {
  it("is not an admin without a cookie", async () => {
    expect(await session.isAdmin()).toBe(false);
  });

  it("creates a signed session that isAdmin accepts", async () => {
    await session.createSession();
    expect(jar.get("wp_session")).toMatch(/^[\w-]+\.[\w-]+$/);
    expect(await session.isAdmin()).toBe(true);
  });

  it("rejects a tampered payload", async () => {
    await session.createSession();
    const [, sig] = jar.get("wp_session")!.split(".");
    const forged = Buffer.from(JSON.stringify({ admin: true, exp: Date.now() + 1e9 })).toString(
      "base64url",
    );
    jar.set("wp_session", `${forged}.${sig}`);
    expect(await session.isAdmin()).toBe(false);
  });

  it("rejects garbage tokens", async () => {
    jar.set("wp_session", "not-a-token");
    expect(await session.isAdmin()).toBe(false);
    jar.set("wp_session", "abc.def");
    expect(await session.isAdmin()).toBe(false);
  });

  it("expires after 30 days", async () => {
    vi.useFakeTimers();
    await session.createSession();
    vi.advanceTimersByTime(30 * 24 * 60 * 60 * 1000 + 1000);
    expect(await session.isAdmin()).toBe(false);
  });

  it("destroySession logs out", async () => {
    await session.createSession();
    await session.destroySession();
    expect(await session.isAdmin()).toBe(false);
  });
});

describe("WebAuthn challenge", () => {
  it("can be consumed exactly once", async () => {
    await session.setChallenge("challenge-123");
    expect(await session.consumeChallenge()).toBe("challenge-123");
    expect(await session.consumeChallenge()).toBeNull();
  });

  it("expires after five minutes", async () => {
    vi.useFakeTimers();
    await session.setChallenge("old");
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
    expect(await session.consumeChallenge()).toBeNull();
  });
});

describe("secret handling", () => {
  it("refuses to sign with a missing or placeholder secret", async () => {
    vi.stubEnv("SESSION_SECRET", "changeme");
    await expect(session.createSession()).rejects.toThrow(/SESSION_SECRET/);
  });
});
