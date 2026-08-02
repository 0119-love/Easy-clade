import { PageLoader } from "@/components/ui/spinner";

/**
 * Next.js wraps every route under (dashboard) in a Suspense boundary keyed
 * to this file (see loading.js docs) -- Sidebar/TopBar (part of layout.tsx,
 * not this segment) stay put and interactive, only the content area shows
 * this while the destination tab's page streams in.
 */
export default function DashboardLoading() {
  return <PageLoader />;
}
