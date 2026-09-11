import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveS3Key } from "@/lib/files";
import { getObjectStream, putObject, tryGetObject } from "@/lib/s3";
import { isAdmin } from "@/lib/session";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const file = await db.file.findUnique({
    where: { id },
    include: { version: { include: { project: { select: { deletedAt: true, hidden: true } } } } },
  });
  if (!file || file.type !== "IMAGE" || file.version.project.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Thumbnails of a hidden project are admin-only, like the files themselves.
  if (file.version.project.hidden && !(await isAdmin())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cached alongside the original under thumb/, keyed by the same base key
  // clones share - so a cloned version reuses the source image's thumbnail
  // too, instead of re-deriving it.
  const baseKey = resolveS3Key(file.s3Key);
  const thumbKey = `thumb/${baseKey}.webp`;

  let thumb = await tryGetObject(thumbKey);
  if (!thumb) {
    const body = await getObjectStream(baseKey);
    if (!body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const buffer = Buffer.from(await new Response(body as BodyInit).arrayBuffer());
    thumb = await sharp(buffer)
      .resize(480, 480, { fit: "cover", position: "attention" })
      .webp({ quality: 78 })
      .toBuffer();
    await putObject(thumbKey, thumb, "image/webp");
  }

  return new NextResponse(new Uint8Array(thumb), {
    headers: {
      "Content-Type": "image/webp",
      // Private: a project can be hidden later, and shared caches must not
      // keep serving its thumbnails afterwards.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
