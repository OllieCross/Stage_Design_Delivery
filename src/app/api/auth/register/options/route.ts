import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin, setChallenge } from "@/lib/session";
import { adminUserName, rpID, rpName } from "@/lib/webauthn";

// Registration is allowed either with the one-time SETUP_TOKEN (first
// enrollment) or from an already authenticated admin session (re-enrollment).
export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const setupToken = process.env.SETUP_TOKEN;
  const authorized =
    (await isAdmin()) || (!!setupToken && setupToken !== "changeme" && token === setupToken);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.credential.findMany({ select: { id: true, transports: true } });
  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpID(),
    userName: adminUserName,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.id,
      transports: c.transports as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
  await setChallenge(options.challenge);
  return NextResponse.json(options);
}
