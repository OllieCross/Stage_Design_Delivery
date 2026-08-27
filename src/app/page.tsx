import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const SORTS = {
  added: "Date added",
  event: "Event date",
  name: "A-Z",
} as const;

type Sort = keyof typeof SORTS;

export default async function Home(props: { searchParams: Promise<{ sort?: string }> }) {
  const { sort: sortParam } = await props.searchParams;
  const sort: Sort = sortParam === "event" || sortParam === "name" ? sortParam : "added";
  const admin = await isAdmin();

  const projects = await db.project.findMany({
    // Hidden projects stay out of the public list; the admin still sees them.
    where: { deletedAt: null, ...(admin ? {} : { hidden: false }) },
    orderBy:
      sort === "name"
        ? { name: "asc" }
        : sort === "event"
          ? // Undated concepts sort after dated events rather than leading.
            [{ eventDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]
          : { createdAt: "desc" },
    include: { _count: { select: { versions: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase">White Production</h1>
          <p className="text-muted mt-1 text-sm tracking-widest uppercase">Stage design</p>
        </div>
        <Link
          href={admin ? "/admin" : "/login"}
          className="text-muted border border-neutral-700 px-3 py-2 text-xs tracking-widest uppercase transition hover:border-white hover:text-white"
        >
          {admin ? "Admin" : "Login"}
        </Link>
      </header>

      <section className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-muted text-xs font-bold tracking-widest uppercase">Projects</h2>
          <nav className="flex gap-2" aria-label="Sort projects">
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
        </div>

        <ul className="mt-4 divide-y divide-neutral-800 border-y border-neutral-800">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.slug}`}
                className="group flex items-baseline justify-between gap-4 px-2 py-5 transition hover:bg-neutral-900"
              >
                <span className="min-w-0">
                  <span className="text-lg font-semibold tracking-tight uppercase group-hover:underline group-hover:underline-offset-8">
                    {p.name}
                  </span>
                  {admin && p.hidden && (
                    <span className="text-muted ml-3 border border-neutral-700 px-1.5 py-0.5 text-[10px] tracking-widest uppercase">
                      Hidden
                    </span>
                  )}
                </span>
                <span className="text-muted shrink-0 text-xs tracking-widest uppercase">
                  {formatDate(p.eventDate)}
                </span>
              </Link>
            </li>
          ))}
          {projects.length === 0 && (
            <li className="text-muted px-2 py-8 text-sm">No projects published yet.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
