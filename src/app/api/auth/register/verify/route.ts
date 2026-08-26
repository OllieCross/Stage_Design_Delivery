import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consumeChallenge, createSession, isAdmin } from "@/lib/session";
import { rpID, rpOrigin } from "@/lib/webauthn";

export async function POST(req: NextRequest) {
  const { token, response } = (await req.json().catch(() => ({}))) as {
    token?: string;
    response?: RegistrationResponseJSON;
  };
  const setupToken = process.env.SETUP_TOKEN;
  const authorized =
    (await isAdmin()) || (!!setupToken && setupToken !== "changeme" && token === setupToken);
  if (!authorized || !response) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expectedChallenge = await consumeChallenge();
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge expired" }, { status: 400 });
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rpOrigin(),
    expectedRPID: rpID(),
  });
  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;
  await db.credential.create({
    data: {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      transports: credential.transports ?? [],
    },
  });

  await createSession();
  return NextResponse.json({ verified: true });
}
