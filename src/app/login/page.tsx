import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import { login } from "@/server/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in - White Production" };

const ERRORS: Record<string, string> = {
  invalid: "Wrong username or password.",
  rate: "Too many attempts. Wait a minute and try again.",
};

const inputClass =
  "w-full border border-neutral-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-white/30";

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/");
  const { error } = await props.searchParams;
  const message = error ? ERRORS[error] : undefined;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-white uppercase">White Production</h1>
      <p className="text-muted mt-1 text-sm tracking-widest uppercase">Log in</p>

      <form action={login} className="mt-10 flex flex-col gap-4">
        <label className="text-muted flex flex-col gap-1.5 text-xs tracking-widest uppercase">
          Username
          <input
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            required
            autoFocus
            className={inputClass}
          />
        </label>
        <label className="text-muted flex flex-col gap-1.5 text-xs tracking-widest uppercase">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </label>
        {message && (
          <p role="alert" className="text-sm text-red-400">
            {message}
          </p>
        )}
        <button className="mt-2 bg-white px-4 py-2.5 text-xs font-bold tracking-widest text-black uppercase transition hover:bg-neutral-200">
          Log in
        </button>
      </form>
    </main>
  );
}
