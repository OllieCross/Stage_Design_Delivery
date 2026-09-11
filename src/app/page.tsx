import Link from "next/link";
import { HdriAdmin } from "@/components/admin/hdri-admin";
import { LogoutButton } from "@/components/logout-button";
import { PasskeyEdit } from "@/components/passkey-edit";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatGigabytes } from "@/lib/files";
import { isAdmin } from "@/lib/session";
import { createProject, restoreProject } from "@/server/actions";
import { totalStorageBytes } from "@/server/storage";

export const dynamic = "force-dynamic";

const SORTS = {
  added: "Date added",
  event: "Event date",
  name: "A-Z",
} as const;

type Sort = keyof typeof SORTS;

export default async function Home(props: { searchParams: Promise<{ sort?: string }> }) {
  const admin = await isAdmin();

  // A visitor without a passkey gets nothing to browse here - no project
  // list is fetched or rendered at all, only this. Every project still opens
  // directly at /projects/[slug] for whoever holds that link; this page is
  // just no longer how someone finds one.
  if (!admin) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight uppercase">White Production</h1>
        <p className="text-muted mt-1 text-sm tracking-widest uppercase">Stage design</p>
        <div className="mt-10">
          <PasskeyEdit />
        </div>
      </main>
    );
  }

  const { sort: sortParam } = await props.searchParams;
  const sort: Sort = sortParam === "event" || sortParam === "name" ? sortParam : "added";

  const [projects, trashed, storageBytes, hdris] = await Promise.all([
    db.project.findMany({
      where: { deletedAt: null },
      orderBy:
        sort === "name"
          ? { name: "asc" }
          : sort === "event"
            ? // Undated concepts sort after dated events rather than leading.
              [{ eventDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]
            : { createdAt: "desc" },
      include: { _count: { select: { versions: true } } },
    }),
    db.project.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }),
    totalStorageBytes(),
    db.hdriAsset.findMany(),
  ]);
  const dayHdri = hdris.find((h) => h.variant === "DAY") ?? null;
  const nightHdri = hdris.find((h) => h.variant === "NIGHT") ?? null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase">White Production</h1>
          <p className="text-muted mt-1 text-sm tracking-widest uppercase">Stage design</p>
        </div>
        <LogoutButton />
      </header>

      <form action={createProject} className="mt-8 flex flex-col gap-3 sm:flex-row">
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

      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-muted text-xs font-bold tracking-widest uppercase">Projects</h2>
          <p className="text-muted text-xs tracking-widest uppercase">
            {formatGigabytes(storageBytes)} stored
          </p>
        </div>

        <nav className="mt-3 flex gap-2" aria-label="Sort projects">
          {(Object.keys(SORTS) as Sort[]).map((key) => (
            <Link
              key={key}
              href={key === "added" ? "/" : `/?sort=${key}`}
              scroll={false}
              className={`border px-2.5 py-1 text-[10px] tracking-widest uppercase transition ${
                sort === key
                  ? "border-white text-white"
                  : "text-muted border-neutral-800 hover:border-neutral-500 hover:text-white"
              }`}
            >
              {SORTS[key]}
            </Link>
          ))}
        </nav>

        <ul className="mt-4 divide-y divide-neutral-800 border-y border-neutral-800">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/projects/${p.id}`}
                className="flex items-center justify-between gap-4 px-2 py-4 transition hover:bg-neutral-900"
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
      </section>

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

      <HdriAdmin day={dayHdri} night={nightHdri} />
    </main>
  );
}
