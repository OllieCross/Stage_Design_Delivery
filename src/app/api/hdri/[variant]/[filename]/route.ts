import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getObjectStream } from "@/lib/s3";

/**
 * Streams the shared Day/Night HDRI. Public and uncredentialed - it's
 * decorative environment art shared by every project, not project data - and
 * cacheable, unlike a project's files, since it's identical for every viewer.
 *
 * [filename] is unused; it exists only so the URL ends in a real
 * ".hdr"/".exr" extension, which is how drei's loader picks RGBE vs EXR.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ variant: string; filename: string }> },
) {
  const { variant: raw } = await ctx.params;
  const variant = raw.toUpperCase();
  if (variant !== "DAY" && variant !== "NIGHT") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const asset = await db.hdriAsset.findUnique({ where: { variant } });
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await getObjectStream(asset.s3Key);
  if (!body) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stream = Readable.toWeb(body as Readable) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": asset.contentType,
      "Content-Length": String(asset.size),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
