import { notFound } from "next/navigation";
import { TourClient } from "@/components/viewer/tour-client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TourPage(props: {
  params: Promise<{ slug: string; fileId: string }>;
}) {
  const { slug, fileId } = await props.params;
  const file = await db.file.findUnique({
    where: { id: fileId },
    include: {
      version: { include: { project: { select: { slug: true, deletedAt: true } } } },
      presets: { orderBy: { order: "asc" } },
    },
  });
  if (
    !file ||
    file.type !== "MODEL" ||
    file.version.project.slug !== slug ||
    file.version.project.deletedAt
  ) {
    notFound();
  }

  return (
    <TourClient
      modelUrl={`/api/files/${file.id}/raw`}
      presets={file.presets}
      backHref={`/projects/${slug}`}
      name={file.name}
    />
  );
}
