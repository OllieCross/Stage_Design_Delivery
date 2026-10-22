import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "session";
const SESSION_TTL_S = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s === "changeme") {
    throw new Error("SESSION_SECRET must be set to a real secret");
  }
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function pack(data: object, ttlSeconds: number) {
  const payload = Buffer.from(
    JSON.stringify({ ...data, exp: Date.now() + ttlSeconds * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function unpack<T>(token: string | undefined): (T & { exp: number }) | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as T & { exp: number };
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Checks the submitted login against ADMIN_USER / ADMIN_PASSWORD. Compares
 * fixed-length digests so timing does not leak the length or prefix, and
 * fails closed when either variable is unset.
 */
export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) return false;
  const userOk = timingSafeEqual(digest(username), digest(expectedUser));
  const passwordOk = timingSafeEqual(digest(password), digest(expectedPassword));
  return userOk && passwordOk;
}

export async function createSession() {
  (await cookies()).set(SESSION_COOKIE, pack({ admin: true }, SESSION_TTL_S), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_S,
    path: "/",
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * True for a visitor holding a valid login cookie. The project list and /edit
 * require it; individual project pages and their files stay public unless the
 * project is hidden. Fails closed if SESSION_SECRET is missing.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    return unpack<{ admin: boolean }>(token)?.admin === true;
  } catch {
    return false;
  }
}
