import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consumeChallenge, createSession } from "@/lib/session";
import { rpID, rpOrigin } from "@/lib/webauthn";

export async function POST(req: NextRequest) {
  const response = (await req.json().catch(() => null)) as AuthenticationResponseJSON | null;
  if (!response?.id) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const credential = await db.credential.findUnique({ where: { id: response.id } });
  if (!credential) {
    return NextResponse.json({ error: "Unknown credential" }, { status: 400 });
  }

  const expectedChallenge = await consumeChallenge();
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge expired" }, { status: 400 });
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rpOrigin(),
    expectedRPID: rpID(),
    credential: {
      id: credential.id,
      publicKey: new Uint8Array(credential.publicKey),
      counter: Number(credential.counter),
      transports: credential.transports as AuthenticatorTransport[],
    },
  });
  if (!verification.verified) {
    return NextResponse.json({ error: "Verification failed" }, { status: 401 });
  }

  await db.credential.update({
    where: { id: credential.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter) },
  });

  await createSession();
  return NextResponse.json({ verified: true });
}
