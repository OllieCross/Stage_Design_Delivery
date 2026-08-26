import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "wp_session";
const CHALLENGE_COOKIE = "wp_challenge";
const SESSION_TTL_S = 60 * 60 * 24 * 30; // 30 days
const CHALLENGE_TTL_S = 60 * 5;

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
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as T & { exp: number };
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
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

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return unpack<{ admin: boolean }>(token)?.admin === true;
}

/** Stores the WebAuthn challenge between the options and verify requests. */
export async function setChallenge(challenge: string) {
  (await cookies()).set(CHALLENGE_COOKIE, pack({ challenge }, CHALLENGE_TTL_S), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CHALLENGE_TTL_S,
    path: "/",
  });
}

export async function consumeChallenge(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(CHALLENGE_COOKIE)?.value;
  store.delete(CHALLENGE_COOKIE);
  return unpack<{ challenge: string }>(token)?.challenge ?? null;
}
