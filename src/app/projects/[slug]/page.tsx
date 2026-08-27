import Link from "next/link";
import { notFound } from "next/navigation";
import { CsvTable } from "@/components/public/csv-table";
import { ImageGallery } from "@/components/public/image-gallery";
import { db } from "@/lib/db";
import { BEAMS_ENABLED } from "@/lib/features";
import { FILE_TYPE_LABELS, formatBytes } from "@/lib/files";

export const dynamic = "force-dynamic";

export default async function ProjectPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const [{ slug }, { version: versionParam }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  const project = await db.project.findUnique({
    where: { slug },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        include: { files: { orderBy: { name: "asc" } } },
      },
    },
  });
  if (!project || project.deletedAt || project.versions.length === 0) notFound();

  const selected = project.versions.find((v) => v.label === versionParam) ?? project.versions[0];

  const models = selected.files.filter((f) => f.type === "MODEL");
  const pdfs = selected.files.filter((f) => f.type === "PDF");
  const images = selected.files.filter((f) => f.type === "IMAGE");
  const csvs = selected.files.filter((f) => f.type === "CSV");
  const scenes = selected.files.filter((f) => f.type === "MVR");
  const other = selected.files.filter((f) => f.type === "OTHER");

  // Fixtures are parsed and stored on upload, but stay invisible until beams ship.
  const fixtureCount = BEAMS_ENABLED
    ? await db.fixture.count({ where: { versionId: selected.id } })
    : 0;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <header>
        <Link href="/" className="text-muted text-xs tracking-widest uppercase hover:text-white">
          White Production
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight uppercase">{project.name}</h1>

        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Versions">
          {project.versions.map((v) => (
            <Link
              key={v.id}
              href={`/projects/${project.slug}?version=${encodeURIComponent(v.label)}`}
              className={`border px-3 py-1.5 text-xs font-semibold tracking-widest uppercase transition ${
                v.id === selected.id
                  ? "border-white bg-white text-black"
                  : "text-muted border-neutral-700 hover:border-white hover:text-white"
              }`}
            >
              {v.label}
            </Link>
          ))}
        </nav>
      </header>

      {models.length > 0 && (
        <section className="mt-12">
          <h2 className="text-muted text-xs font-bold tracking-widest uppercase">
            {FILE_TYPE_LABELS.MODEL}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {models.map((f) => (
              <div key={f.id} className="border border-neutral-800 p-5">
                <p className="truncate font-semibold uppercase">{f.name}</p>
                <p className="text-muted mt-1 text-xs">{formatBytes(f.size)}</p>
                <div className="mt-4 flex gap-3">
                  <Link
                    href={`/projects/${project.slug}/tour/${f.id}`}
                    className="bg-white px-4 py-2 text-xs font-bold tracking-widest text-black uppercase transition hover:bg-neutral-200"
                  >
                    Open 3D tour
                  </Link>
                  <a
                    href={`/api/files/${f.id}/download`}
                    className="text-muted border border-neutral-700 px-4 py-2 text-xs tracking-widest uppercase transition hover:border-white hover:text-white"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {pdfs.length > 0 && (
        <section className="mt-12">
          <h2 className="text-muted text-xs font-bold tracking-widest uppercase">
            {FILE_TYPE_LABELS.PDF}
          </h2>
          <ul className="mt-4 divide-y divide-neutral-800 border-y border-neutral-800">
            {pdfs.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-4 px-2 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="text-muted text-xs">{formatBytes(f.size)}</p>
                </div>
                <div className="flex shrink-0 gap-4">
                  <Link
                    href={`/projects/${project.slug}/document/${f.id}`}
                    className="text-xs tracking-widest uppercase underline-offset-4 hover:underline"
                  >
                    View
                  </Link>
                  <a
                    href={`/api/files/${f.id}/download`}
                    className="text-muted text-xs tracking-widest uppercase hover:text-white"
                  >
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {images.length > 0 && (
        <section className="mt-12">
          <h2 className="text-muted text-xs font-bold tracking-widest uppercase">
            {FILE_TYPE_LABELS.IMAGE}
          </h2>
          <ImageGallery images={images.map((f) => ({ id: f.id, name: f.name, size: f.size }))} />
        </section>
      )}

      {csvs.map((f) => (
        <section key={f.id} className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-muted text-xs font-bold tracking-widest uppercase">{f.name}</h2>
            <a
              href={`/api/files/${f.id}/download`}
              className="text-muted text-xs tracking-widest uppercase hover:text-white"
            >
              Download
            </a>
          </div>
          <CsvTable fileId={f.id} />
        </section>
      ))}

      {scenes.length > 0 && (
        <section className="mt-12">
          <h2 className="text-muted text-xs font-bold tracking-widest uppercase">
            {FILE_TYPE_LABELS.MVR}
          </h2>
          <ul className="mt-4 divide-y divide-neutral-800 border-y border-neutral-800">
            {scenes.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-4 px-2 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="text-muted text-xs">
                    {formatBytes(f.size)}
                    {fixtureCount > 0 && ` · ${fixtureCount} fixtures lighting the 3D tour`}
                  </p>
                </div>
                <a
                  href={`/api/files/${f.id}/download`}
                  className="text-muted shrink-0 text-xs tracking-widest uppercase hover:text-white"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {other.length > 0 && (
        <section className="mt-12">
          <h2 className="text-muted text-xs font-bold tracking-widest uppercase">
            {FILE_TYPE_LABELS.OTHER}
          </h2>
          <ul className="mt-4 divide-y divide-neutral-800 border-y border-neutral-800">
            {other.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-4 px-2 py-4">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <a
                  href={`/api/files/${f.id}/download`}
                  className="text-muted shrink-0 text-xs tracking-widest uppercase hover:text-white"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
