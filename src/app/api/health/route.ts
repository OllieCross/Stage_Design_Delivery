import { NextResponse } from "next/server";

// Liveness only: a hung process won't answer this either, so no DB/S3 round
// trip is needed to tell Docker the container is stuck.
export async function GET() {
  return NextResponse.json({ ok: true });
}
