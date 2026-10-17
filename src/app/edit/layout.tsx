import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) {
    redirect("/");
  }
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <span className="text-sm font-bold tracking-widest uppercase">White Production — Edit</span>
      </header>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
