import { Readable } from "stream";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveS3Key } from "@/lib/files";
import { getObjectStream } from "@/lib/s3";

/**
 * Streams a stored file to the client. Files are public by design: anyone
 * with a project link may view and download everything in it.
 */
export async function serveFile(fileId: string, disposition: "inline" | "attachment") {
  const file = await db.file.findUnique({
    where: { id: fileId },
    include: { version: { include: { project: { select: { deletedAt: true } } } } },
  });
  if (!file || file.version.project.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await getObjectStream(resolveS3Key(file.s3Key));
  if (!body) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stream = Readable.toWeb(body as Readable) as ReadableStream;
  const filename = encodeURIComponent(file.name);
  return new NextResponse(stream, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
