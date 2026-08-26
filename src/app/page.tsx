import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await db.project.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { versions: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase">White Production</h1>
          <p className="text-muted mt-1 text-sm tracking-widest uppercase">Stage design delivery</p>
        </div>
        <Link
          href="/login"
          className="text-muted border border-neutral-700 px-3 py-2 text-xs tracking-widest uppercase transition hover:border-white hover:text-white"
        >
          Login
        </Link>
      </header>

      <section className="mt-14">
        <h2 className="text-muted text-xs font-bold tracking-widest uppercase">Projects</h2>
        <ul className="mt-4 divide-y divide-neutral-800 border-y border-neutral-800">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.slug}`}
                className="group flex items-baseline justify-between px-2 py-5 transition hover:bg-neutral-900"
              >
                <span className="text-lg font-semibold tracking-tight uppercase group-hover:underline group-hover:underline-offset-8">
                  {p.name}
                </span>
                <span className="text-muted text-xs tracking-widest uppercase">
                  {p._count.versions} version{p._count.versions === 1 ? "" : "s"}
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
