import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_LABEL,
  detectFileType,
  s3KeyFor,
  verifyMagicBytes,
} from "@/lib/files";
import { classifyFixture } from "@/lib/fixture-kinds";
import { parseMvr } from "@/lib/mvr";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { putObject } from "@/lib/s3";
import { isAdmin } from "@/lib/session";

// Generous compared to the auth endpoints' 10/min: a drag-and-drop batch of
// photos or plots is many requests in quick succession from one admin.
const UPLOAD_MAX_PER_WINDOW = 60;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimit(clientKey(req, "upload"), UPLOAD_MAX_PER_WINDOW)) {
    return NextResponse.json({ error: "Too many uploads, slow down" }, { status: 429 });
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
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = detectFileType(file.name);
  if (!verifyMagicBytes(type, file.name, bytes)) {
    return NextResponse.json(
      { error: "File content doesn't match its extension" },
      { status: 400 },
    );
  }

  const key = s3KeyFor(version.projectId, version.id, file.name);
  await putObject(key, bytes, contentType);
  const record = await db.file.create({
    data: {
      versionId,
      type,
      name: file.name,
      s3Key: key,
      size: file.size,
      contentType,
    },
  });

  // An MVR carries the lighting rig: extract its fixtures so the 3D tour can
  // render beams. A malformed archive must not fail the upload itself.
  let fixtureCount = 0;
  if (type === "MVR") {
    try {
      const fixtures = parseMvr(new Uint8Array(bytes));
      if (fixtures.length > 0) {
        await db.fixture.createMany({
          data: fixtures.map((f) => ({
            versionId,
            sourceFileId: record.id,
            name: f.name,
            gdtfSpec: f.gdtfSpec,
            kind: classifyFixture(f.name, f.gdtfSpec),
            x: f.x,
            y: f.y,
            z: f.z,
            dirX: f.dirX,
            dirY: f.dirY,
            dirZ: f.dirZ,
            universe: f.universe,
            address: f.address,
          })),
        });
        fixtureCount = fixtures.length;
      }
    } catch (e) {
      console.error("[upload] MVR parse failed", e);
    }
  }

  return NextResponse.json({
    id: record.id,
    name: record.name,
    type: record.type,
    fixtureCount,
  });
}
