import { notFound } from "next/navigation";
import { TourClient } from "@/components/viewer/tour-client";
import { db } from "@/lib/db";
import { hdriUrlExtension } from "@/lib/files";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TourPage(props: {
  params: Promise<{ slug: string; fileId: string }>;
}) {
  const { slug, fileId } = await props.params;
  const file = await db.file.findUnique({
    where: { id: fileId },
    include: {
      version: {
        include: { project: { select: { slug: true, deletedAt: true, hidden: true } } },
      },
      presets: { orderBy: { order: "asc" } },
    },
  });
  if (
    !file ||
    file.type !== "MODEL" ||
    file.version.project.slug !== slug ||
    file.version.project.deletedAt ||
    (file.version.project.hidden && !(await isAdmin()))
  ) {
    notFound();
  }

  // Fixtures come from an MVR uploaded alongside the model in the same version.
  const fixtures = await db.fixture.findMany({
    where: { versionId: file.versionId },
    select: {
      id: true,
      name: true,
      kind: true,
      x: true,
      y: true,
      z: true,
      dirX: true,
      dirY: true,
      dirZ: true,
    },
  });

  // Day/night sky, from whichever HDRIs (if any) the admin assigned to each
  // slot for this version.
  const hdris = await db.file.findMany({
    where: { versionId: file.versionId, type: "HDRI", hdriVariant: { not: null } },
    select: { id: true, name: true, hdriVariant: true },
  });
  const dayHdri = hdris.find((h) => h.hdriVariant === "DAY");
  const nightHdri = hdris.find((h) => h.hdriVariant === "NIGHT");
  // The extension in the URL (not the actual filename) is what tells drei's
  // loader RGBE from EXR - see the [filename] route.
  const hdriUrl = (h: { id: string; name: string }) =>
    `/api/files/${h.id}/raw/env.${hdriUrlExtension(h.name)}`;

  return (
    <TourClient
      modelUrl={`/api/files/${file.id}/raw`}
      presets={file.presets}
      fixtures={fixtures}
      backHref={`/projects/${slug}`}
      name={file.name}
      dayHdriUrl={dayHdri && hdriUrl(dayHdri)}
      nightHdriUrl={nightHdri && hdriUrl(nightHdri)}
    />
  );
}
