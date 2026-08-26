import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight uppercase">Not found</h1>
      <p className="text-muted text-sm">This project or file does not exist, or was removed.</p>
      <Link
        href="/"
        className="text-muted mt-2 text-xs tracking-widest uppercase underline-offset-4 hover:text-white hover:underline"
      >
        Back to projects
      </Link>
    </main>
  );
}
