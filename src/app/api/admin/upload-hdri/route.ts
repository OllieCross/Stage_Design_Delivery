import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_LABEL,
  hdriUrlExtension,
  verifyHdriMagicBytes,
} from "@/lib/files";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { deleteObject, putObject } from "@/lib/s3";
import { isAdmin } from "@/lib/session";

const UPLOAD_MAX_PER_WINDOW = 60;

/**
 * Uploads (or replaces) the shared Day or Night HDRI used by every project's
 * 3D tour - global, not scoped to a version like /api/admin/upload.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimit(clientKey(req, "upload"), UPLOAD_MAX_PER_WINDOW)) {
    return NextResponse.json({ error: "Too many uploads, slow down" }, { status: 429 });
  }

  const formData = await req.formData();
  const variantRaw = String(formData.get("variant") ?? "");
  const file = formData.get("file");
  if ((variantRaw !== "DAY" && variantRaw !== "NIGHT") || !(file instanceof File)) {
    return NextResponse.json({ error: "variant (DAY/NIGHT) and file required" }, { status: 400 });
  }
  const variant = variantRaw;
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_FILE_SIZE_LABEL} limit` },
      { status: 413 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!verifyHdriMagicBytes(file.name, bytes)) {
    return NextResponse.json(
      { error: "File content doesn't match a Radiance HDR or OpenEXR image" },
      { status: 400 },
    );
  }

  const ext = hdriUrlExtension(file.name);
  const key = `env/${variant.toLowerCase()}.${ext}`;
  const contentType = file.type || "application/octet-stream";
  await putObject(key, bytes, contentType);

  const previous = await db.hdriAsset.findUnique({ where: { variant } });
  await db.hdriAsset.upsert({
    where: { variant },
    create: { variant, name: file.name, s3Key: key, size: file.size, contentType },
    update: { name: file.name, s3Key: key, size: file.size, contentType },
  });
  // The key is fixed per slot except for its extension, so a re-upload under
  // a different format (e.g. .hdr replaced with .exr) would otherwise orphan
  // the old object.
  if (previous && previous.s3Key !== key) {
    await deleteObject(previous.s3Key).catch(() => {});
  }

  return NextResponse.json({ variant, name: file.name, size: file.size });
}
