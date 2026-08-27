import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL, detectFileType, s3KeyFor } from "@/lib/files";
import { putObject } from "@/lib/s3";
import { isAdmin } from "@/lib/session";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const versionId = String(formData.get("versionId") ?? "");
  const file = formData.get("file");
  if (!versionId || !(file instanceof File)) {
    return NextResponse.json({ error: "versionId and file required" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_FILE_SIZE_LABEL} limit` },
      { status: 413 },
    );
  }

  const version = await db.version.findUnique({ where: { id: versionId } });
  if (!version) {
    return NextResponse.json({ error: "Unknown version" }, { status: 404 });
  }

  const contentType = file.type || "application/octet-stream";
  const key = s3KeyFor(version.projectId, version.id, file.name);
  await putObject(key, Buffer.from(await file.arrayBuffer()), contentType);

  const record = await db.file.create({
    data: {
      versionId,
      type: detectFileType(file.name),
      name: file.name,
      s3Key: key,
      size: file.size,
      contentType,
    },
  });

  return NextResponse.json({ id: record.id, name: record.name, type: record.type });
}
