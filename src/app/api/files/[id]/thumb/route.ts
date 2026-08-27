import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveS3Key } from "@/lib/files";
import { getObjectStream } from "@/lib/s3";
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

  const body = await getObjectStream(resolveS3Key(file.s3Key));
  if (!body) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buffer = Buffer.from(await new Response(body as BodyInit).arrayBuffer());
  const thumb = await sharp(buffer)
    .resize(480, 480, { fit: "cover", position: "attention" })
    .webp({ quality: 78 })
    .toBuffer();

  return new NextResponse(new Uint8Array(thumb), {
    headers: {
      "Content-Type": "image/webp",
      // Private: a project can be hidden later, and shared caches must not
      // keep serving its thumbnails afterwards.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
