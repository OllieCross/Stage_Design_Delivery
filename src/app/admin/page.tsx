import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatGigabytes } from "@/lib/files";
import { createProject, restoreProject } from "@/server/actions";
import { totalStorageBytes } from "@/server/storage";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [projects, trashed, storageBytes] = await Promise.all([
    db.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { versions: true } } },
    }),
    db.project.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
    totalStorageBytes(),
  ]);

  return (
    <main className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight uppercase">Projects</h1>
        <p className="text-muted text-xs tracking-widest uppercase">
          {formatGigabytes(storageBytes)} stored
        </p>
      </div>

      <form action={createProject} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          name="name"
          required
          placeholder="Project name"
          className="flex-1 rounded-md border border-neutral-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
        <input
          name="slug"
          placeholder="slug (optional)"
          pattern="[a-z0-9-]*"
          className="flex-1 rounded-md border border-neutral-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
        <button className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black uppercase transition hover:bg-neutral-200">
          Create
        </button>
      </form>

      <ul className="mt-8 divide-y divide-neutral-800 border-y border-neutral-800">
        {projects.map((p) => (
          <li key={p.id}>
            <Link
              href={`/admin/projects/${p.id}`}
              className="flex items-center justify-between px-2 py-4 transition hover:bg-neutral-900"
            >
              <div className="min-w-0">
                <span className="font-semibold">{p.name}</span>
                <span className="text-muted ml-3 text-sm">/{p.slug}</span>
                {p.hidden && (
                  <span className="text-muted ml-3 border border-neutral-700 px-1.5 py-0.5 text-[10px] tracking-widest uppercase">
                    Hidden
                  </span>
                )}
              </div>
              <span className="text-muted shrink-0 text-sm">
                {formatDate(p.eventDate)} · {p._count.versions} version
                {p._count.versions === 1 ? "" : "s"}
              </span>
            </Link>
          </li>
        ))}
        {projects.length === 0 && (
          <li className="text-muted px-2 py-6 text-sm">No projects yet.</li>
        )}
      </ul>

      {trashed.length > 0 && (
        <section className="mt-12">
          <h2 className="text-muted text-sm font-bold tracking-widest uppercase">
            Trash (purged after 7 days)
          </h2>
          <ul className="mt-3 divide-y divide-neutral-800 border-y border-neutral-800">
            {trashed.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-2 py-3">
                <span className="text-muted text-sm">
                  {p.name}
                  <span className="ml-3">deleted {formatDate(p.deletedAt)}</span>
                </span>
                <form action={restoreProject}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="text-xs tracking-wide uppercase underline-offset-4 hover:underline">
                    Restore
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
