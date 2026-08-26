import Link from "next/link";
import { db } from "@/lib/db";
import { createProject, restoreProject } from "@/server/actions";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [projects, trashed] = await Promise.all([
    db.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { versions: true } } },
    }),
    db.project.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
  ]);

  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="text-xl font-bold tracking-tight uppercase">Projects</h1>

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
              <div>
                <span className="font-semibold">{p.name}</span>
                <span className="text-muted ml-3 text-sm">/{p.slug}</span>
              </div>
              <span className="text-muted text-sm">
                {p._count.versions} version{p._count.versions === 1 ? "" : "s"}
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
                  <span className="ml-3">
                    deleted {p.deletedAt ? new Date(p.deletedAt).toLocaleDateString("en-GB") : ""}
                  </span>
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
