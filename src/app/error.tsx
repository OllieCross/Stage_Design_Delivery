"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight uppercase">Something went wrong</h1>
      <p className="text-muted text-sm">The request could not be completed.</p>
      <button
        onClick={reset}
        className="text-muted mt-2 text-xs tracking-widest uppercase underline-offset-4 hover:text-white hover:underline"
      >
        Try again
      </button>
    </main>
  );
}
