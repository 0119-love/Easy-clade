import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { AutomationRunner } from "@/components/dashboard/AutomationRunner";
import { DashboardPrefetch } from "@/components/dashboard/DashboardPrefetch";
import { getSessionUser } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Secure check (hits the sessions table) -- proxy.ts only did the optimistic
  // cookie-presence check before this ever rendered. See the Next.js auth
  // guide's two-tier pattern (node_modules/next/dist/docs/.../authentication.md).
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userEmail={user.email} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar userEmail={user.email} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette />
      <AutomationRunner />
      <DashboardPrefetch />
    </div>
  );
}
