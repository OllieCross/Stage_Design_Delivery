import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DeleteFileButton,
  TrashProjectButton,
  DeleteVersionButton,
} from "@/components/admin/danger-buttons";
import { PresetEditor } from "@/components/admin/preset-editor";
import { UploadZone } from "@/components/admin/upload-zone";
import { db } from "@/lib/db";
import { FILE_TYPE_LABELS, FILE_TYPE_ORDER, formatBytes } from "@/lib/files";
import { createVersion } from "@/server/actions";

export const dynamic = "force-dynamic";

export default async function AdminProjectPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        include: { files: { orderBy: { name: "asc" }, include: { presets: true } } },
      },
    },
  });
  if (!project || project.deletedAt) notFound();

  const latest = project.versions[0];

  return (
    <main className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="text-muted text-xs tracking-wide uppercase hover:text-white"
          >
            Projects
          </Link>
          <h1 className="mt-1 text-xl font-bold tracking-tight uppercase">{project.name}</h1>
          <p className="text-muted text-sm">
            Public link: <span className="select-all">/projects/{project.slug}</span>
          </p>
        </div>
        <TrashProjectButton projectId={project.id} />
      </div>

      <form action={createVersion} className="mt-8 flex flex-wrap items-center gap-3">
        <input type="hidden" name="projectId" value={project.id} />
        <input
          name="label"
          placeholder={`label (default v${project.versions.length + 1})`}
          className="rounded-md border border-neutral-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
        {latest && (
          <label className="text-muted flex items-center gap-2 text-sm">
            <input type="checkbox" name="cloneFrom" value={latest.id} />
            copy files from {latest.label}
          </label>
        )}
        <button className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black uppercase transition hover:bg-neutral-200">
          New version
        </button>
      </form>

      {project.versions.map((version) => (
        <section key={version.id} className="mt-10 rounded-lg border border-neutral-800 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold uppercase">{version.label}</h2>
            <DeleteVersionButton versionId={version.id} label={version.label} />
          </div>

          <UploadZone versionId={version.id} />

          {FILE_TYPE_ORDER.map((type) => {
            const files = version.files.filter((f) => f.type === type);
            if (files.length === 0) return null;
            return (
              <div key={type} className="mt-6">
                <h3 className="text-muted text-xs font-bold tracking-widest uppercase">
                  {FILE_TYPE_LABELS[type]}
                </h3>
                <ul className="mt-2 divide-y divide-neutral-800 border-y border-neutral-800">
                  {files.map((file) => (
                    <li key={file.id} className="px-2 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{file.name}</p>
                          <p className="text-muted text-xs">{formatBytes(file.size)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <a
                            href={`/api/files/${file.id}/download`}
                            className="text-muted text-xs tracking-wide uppercase hover:text-white"
                          >
                            Download
                          </a>
                          <DeleteFileButton fileId={file.id} name={file.name} />
                        </div>
                      </div>
                      {file.type === "MODEL" && <PresetEditor file={file} presets={file.presets} />}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}
