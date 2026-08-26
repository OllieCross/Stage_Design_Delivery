"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { deleteObject } from "@/lib/s3";
import { isAdmin } from "@/lib/session";

async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("Unauthorized");
  }
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- Projects ---

export async function createProject(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  if (!name || !SLUG_RE.test(slug)) {
    throw new Error("Invalid name or slug");
  }
  const project = await db.project.create({
    data: { name, slug, versions: { create: { label: "v1" } } },
  });
  revalidatePath("/admin");
  redirect(`/admin/projects/${project.id}`);
}

export async function renameProject(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name required");
  await db.project.update({ where: { id }, data: { name } });
  revalidatePath("/admin");
  revalidatePath(`/admin/projects/${id}`);
}

export async function trashProject(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await db.project.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/admin");
  redirect("/admin");
}

export async function restoreProject(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await db.project.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/admin");
}

// --- Versions ---

export async function createVersion(formData: FormData) {
  await requireAdmin();
  const projectId = String(formData.get("projectId"));
  const cloneFrom = formData.get("cloneFrom") ? String(formData.get("cloneFrom")) : null;
  let label = String(formData.get("label") ?? "").trim();

  if (!label) {
    const count = await db.version.count({ where: { projectId } });
    label = `v${count + 1}`;
  }

  const version = await db.version.create({ data: { projectId, label } });

  if (cloneFrom) {
    // Cloned records share the source object in S3: the record key gets a
    // `#versionId` suffix for uniqueness and is stripped back to the real
    // object key on read (resolveS3Key). The object itself is only deleted
    // once no record references it (deleteFileObjectIfUnreferenced).
    const files = await db.file.findMany({ where: { versionId: cloneFrom } });
    for (const f of files) {
      await db.file.create({
        data: {
          versionId: version.id,
          type: f.type,
          name: f.name,
          s3Key: `${f.s3Key}#${version.id}`, // unique record key; see resolveS3Key
          size: f.size,
          contentType: f.contentType,
        },
      });
    }
  }

  revalidatePath(`/admin/projects/${projectId}`);
}

export async function deleteVersion(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const version = await db.version.findUnique({ where: { id }, include: { files: true } });
  if (!version) return;
  for (const f of version.files) {
    await deleteFileObjectIfUnreferenced(f.id, f.s3Key);
  }
  await db.version.delete({ where: { id } });
  revalidatePath(`/admin/projects/${version.projectId}`);
}

// --- Files ---

async function deleteFileObjectIfUnreferenced(fileId: string, s3Key: string) {
  const baseKey = s3Key.split("#")[0];
  const others = await db.file.count({
    where: { id: { not: fileId }, s3Key: { startsWith: baseKey } },
  });
  if (others === 0) {
    await deleteObject(baseKey);
  }
}

export async function deleteFile(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const file = await db.file.findUnique({
    where: { id },
    include: { version: { select: { projectId: true } } },
  });
  if (!file) return;
  await deleteFileObjectIfUnreferenced(file.id, file.s3Key);
  await db.file.delete({ where: { id } });
  revalidatePath(`/admin/projects/${file.version.projectId}`);
}

// --- Camera presets ---

export async function createPreset(formData: FormData) {
  await requireAdmin();
  const fileId = String(formData.get("fileId"));
  const name = String(formData.get("name") ?? "").trim() || "Preset";
  const num = (key: string) => Number(formData.get(key) ?? 0) || 0;
  const file = await db.file.findUnique({
    where: { id: fileId },
    include: { version: { select: { projectId: true } }, presets: true },
  });
  if (!file || file.type !== "MODEL") throw new Error("Presets only apply to 3D models");
  await db.cameraPreset.create({
    data: {
      fileId,
      name,
      x: num("x"),
      y: num("y"),
      z: num("z"),
      yaw: num("yaw"),
      pitch: num("pitch"),
      order: file.presets.length,
    },
  });
  revalidatePath(`/admin/projects/${file.version.projectId}`);
}

export async function deletePreset(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const preset = await db.cameraPreset.findUnique({
    where: { id },
    include: { file: { include: { version: { select: { projectId: true } } } } },
  });
  if (!preset) return;
  await db.cameraPreset.delete({ where: { id } });
  revalidatePath(`/admin/projects/${preset.file.version.projectId}`);
}
