import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { setChallenge } from "@/lib/session";
import { rpID } from "@/lib/webauthn";

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "auth"))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const credentials = await db.credential.findMany({ select: { id: true, transports: true } });
  if (credentials.length === 0) {
    return NextResponse.json({ error: "No passkey registered" }, { status: 400 });
  }
  const options = await generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: "preferred",
    allowCredentials: credentials.map((c) => ({
      id: c.id,
      transports: c.transports as AuthenticatorTransport[],
    })),
  });
  await setChallenge(options.challenge);
  return NextResponse.json(options);
}
