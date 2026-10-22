import { beforeEach, describe, expect, it, vi } from "vitest";

class Redirect extends Error {
  constructor(public url: string) {
    super(url);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
}));

let ip = 0;
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": `10.9.0.${ip}` }),
}));

vi.mock("@/lib/session", () => ({
  checkCredentials: vi.fn(),
  createSession: vi.fn(),
  destroySession: vi.fn(),
}));

const session = await import("@/lib/session");
const { login, logout } = await import("@/server/auth");

const form = (username: string, password: string) => {
  const f = new FormData();
  f.set("username", username);
  f.set("password", password);
  return f;
};
const redirectOf = async (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: unknown) => (e instanceof Redirect ? e.url : Promise.reject(e)),
  );

beforeEach(() => {
  vi.clearAllMocks();
  ip += 1;
});

describe("login", () => {
  it("creates a session and goes home on valid credentials", async () => {
    vi.mocked(session.checkCredentials).mockReturnValue(true);
    expect(await redirectOf(login(form("AdminUser", "pw")))).toBe("/");
    expect(session.createSession).toHaveBeenCalledOnce();
  });

  it("returns to the form without a session on bad credentials", async () => {
    vi.mocked(session.checkCredentials).mockReturnValue(false);
    expect(await redirectOf(login(form("AdminUser", "nope")))).toBe("/login?error=invalid");
    expect(session.createSession).not.toHaveBeenCalled();
  });

  it("rate limits repeated attempts from one address", async () => {
    vi.mocked(session.checkCredentials).mockReturnValue(false);
    const results: (string | null)[] = [];
    for (let i = 0; i < 6; i++) results.push(await redirectOf(login(form("a", "b"))));
    expect(results.slice(0, 5).every((r) => r === "/login?error=invalid")).toBe(true);
    expect(results[5]).toBe("/login?error=rate");
  });
});

describe("logout", () => {
  it("destroys the session and returns to the login page", async () => {
    expect(await redirectOf(logout())).toBe("/login");
    expect(session.destroySession).toHaveBeenCalledOnce();
  });
});
