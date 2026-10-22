import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import { logout } from "@/server/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) {
    redirect("/login");
  }
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <span className="text-sm font-bold tracking-widest uppercase">White Production — Edit</span>
        <form action={logout}>
          <button
            type="submit"
            className="text-muted text-xs tracking-widest uppercase transition hover:text-white"
          >
            Log out
          </button>
        </form>
      </header>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
