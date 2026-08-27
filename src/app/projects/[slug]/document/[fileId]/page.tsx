import Link from "next/link";
import { notFound } from "next/navigation";
import { PdfClient } from "@/components/public/pdf-client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DocumentPage(props: {
  params: Promise<{ slug: string; fileId: string }>;
}) {
  const { slug, fileId } = await props.params;
  const file = await db.file.findUnique({
    where: { id: fileId },
    include: { version: { include: { project: { select: { slug: true, deletedAt: true } } } } },
  });
  if (
    !file ||
    file.type !== "PDF" ||
    file.version.project.slug !== slug ||
    file.version.project.deletedAt
  ) {
    notFound();
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-neutral-800 px-4 py-3">
        <Link
          href={`/projects/${slug}`}
          className="text-muted shrink-0 text-xs tracking-widest uppercase transition hover:text-white"
        >
          Back
        </Link>
        <p className="truncate text-xs tracking-widest uppercase">{file.name}</p>
        <a
          href={`/api/files/${file.id}/download`}
          className="text-muted shrink-0 text-xs tracking-widest uppercase transition hover:text-white"
        >
          Download
        </a>
      </header>
      <PdfClient url={`/api/files/${file.id}/raw`} />
    </div>
  );
}
