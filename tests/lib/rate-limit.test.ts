import { afterEach, describe, expect, it, vi } from "vitest";
import { clientKey, rateLimit } from "@/lib/rate-limit";

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows 10 requests per minute by default, then blocks", () => {
    const key = `test:${crypto.randomUUID()}`;
    for (let i = 0; i < 10; i++) expect(rateLimit(key)).toBe(true);
    expect(rateLimit(key)).toBe(false);
  });

  it("honours a custom limit", () => {
    const key = `test:${crypto.randomUUID()}`;
    for (let i = 0; i < 60; i++) expect(rateLimit(key, 60)).toBe(true);
    expect(rateLimit(key, 60)).toBe(false);
  });

  it("resets after the one-minute window", () => {
    vi.useFakeTimers();
    const key = `test:${crypto.randomUUID()}`;
    for (let i = 0; i < 10; i++) rateLimit(key);
    expect(rateLimit(key)).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(rateLimit(key)).toBe(true);
  });

  it("keeps separate buckets per key", () => {
    const a = `test:${crypto.randomUUID()}`;
    const b = `test:${crypto.randomUUID()}`;
    for (let i = 0; i < 10; i++) rateLimit(a);
    expect(rateLimit(a)).toBe(false);
    expect(rateLimit(b)).toBe(true);
  });
});

describe("clientKey", () => {
  it("uses the first X-Forwarded-For hop", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
    expect(clientKey(req, "auth")).toBe("auth:1.2.3.4");
  });

  it("falls back to X-Real-IP, then unknown", () => {
    expect(clientKey(new Request("http://x", { headers: { "x-real-ip": "5.6.7.8" } }), "u")).toBe(
      "u:5.6.7.8",
    );
    expect(clientKey(new Request("http://x"), "u")).toBe("u:unknown");
  });
});
