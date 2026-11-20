import { Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar userName={user.name} />
      <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-5 md:px-7">{children}</main>
    </div>
  );
}
