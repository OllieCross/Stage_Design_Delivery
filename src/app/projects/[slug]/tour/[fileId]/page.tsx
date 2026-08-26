import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TourPage(props: {
  params: Promise<{ slug: string; fileId: string }>;
}) {
  const { slug, fileId } = await props.params;
  const file = await db.file.findUnique({
    where: { id: fileId },
    include: { version: { include: { project: true } }, presets: { orderBy: { order: "asc" } } },
  });
  if (!file || file.type !== "MODEL" || file.version.project.slug !== slug) notFound();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold tracking-tight uppercase">{file.name}</h1>
      <p className="text-muted text-sm">3D tour arrives in Stage 5.</p>
      <Link
        href={`/projects/${slug}`}
        className="text-muted text-xs tracking-widest uppercase hover:text-white"
      >
        ← Back to project
      </Link>
    </main>
  );
}
