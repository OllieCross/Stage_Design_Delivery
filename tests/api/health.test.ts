import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetMocks } from "../mocks";

vi.mock("@/lib/db", async () => ({ db: (await import("../mocks")).db }));
vi.mock("@/lib/session", () => ({
  isAdmin: vi.fn(),
  createSession: vi.fn(),
  destroySession: vi.fn(),
  setChallenge: vi.fn(),
  consumeChallenge: vi.fn(),
}));

const session = await import("@/lib/session");
const loginOptions = await import("@/app/api/auth/login/options/route");
const loginVerify = await import("@/app/api/auth/login/verify/route");
const logout = await import("@/app/api/auth/logout/route");
const registerOptions = await import("@/app/api/auth/register/options/route");
const health = await import("@/app/api/health/route");

let n = 0;
const req = (url: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: { "x-forwarded-for": `10.3.0.${++n}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  resetMocks();
  vi.mocked(session.isAdmin).mockResolvedValue(false);
});

describe("login", () => {
  it("refuses to offer a challenge when no passkey is registered", async () => {
    db.credential.findMany.mockResolvedValue([]);
    const res = await loginOptions.POST(req("/api/auth/login/options"));
    expect(res.status).toBe(400);
    expect(session.setChallenge).not.toHaveBeenCalled();
  });

  it("issues options and stores the challenge", async () => {
    db.credential.findMany.mockResolvedValue([{ id: "cred-1", transports: ["internal"] }]);
    const res = await loginOptions.POST(req("/api/auth/login/options"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.allowCredentials[0].id).toBe("cred-1");
    expect(session.setChallenge).toHaveBeenCalledWith(body.challenge);
  });

  it("rejects a malformed verify body", async () => {
    const res = await loginVerify.POST(req("/api/auth/login/verify", { nope: true }));
    expect(res.status).toBe(400);
  });

  it("rejects an unknown credential", async () => {
    db.credential.findUnique.mockResolvedValue(null);
    const res = await loginVerify.POST(req("/api/auth/login/verify", { id: "ghost" }));
    expect(res.status).toBe(400);
    expect(session.createSession).not.toHaveBeenCalled();
  });

  it("rejects when the challenge has expired", async () => {
    db.credential.findUnique.mockResolvedValue({ id: "cred-1" });
    vi.mocked(session.consumeChallenge).mockResolvedValue(null);
    const res = await loginVerify.POST(req("/api/auth/login/verify", { id: "cred-1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/expired/i);
  });

  it("rate-limits auth attempts from one client", async () => {
    db.credential.findMany.mockResolvedValue([]);
    const headers = { "x-forwarded-for": "10.9.9.9" };
    const make = () => new NextRequest("http://localhost/x", { method: "POST", headers });
    for (let i = 0; i < 10; i++) await loginOptions.POST(make());
    expect((await loginOptions.POST(make())).status).toBe(429);
  });
});

describe("registration", () => {
  it("needs the setup token or an admin session", async () => {
    vi.stubEnv("SETUP_TOKEN", "s3cret-token");
    expect((await registerOptions.POST(req("/r", { token: "wrong" }))).status).toBe(401);
  });

  it("never accepts the placeholder token", async () => {
    vi.stubEnv("SETUP_TOKEN", "changeme");
    expect((await registerOptions.POST(req("/r", { token: "changeme" }))).status).toBe(401);
  });

  it("issues options with the right token", async () => {
    vi.stubEnv("SETUP_TOKEN", "s3cret-token");
    db.credential.findMany.mockResolvedValue([]);
    const res = await registerOptions.POST(req("/r", { token: "s3cret-token" }));
    expect(res.status).toBe(200);
    expect(session.setChallenge).toHaveBeenCalled();
  });
});

describe("logout and health", () => {
  it("logout destroys the session", async () => {
    const res = await logout.POST();
    expect(res.status).toBe(200);
    expect(session.destroySession).toHaveBeenCalled();
  });

  it("health answers without touching the database", async () => {
    const res = await health.GET();
    expect(await res.json()).toEqual({ ok: true });
    expect(db.credential.findMany).not.toHaveBeenCalled();
  });
});
