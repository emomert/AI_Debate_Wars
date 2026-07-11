/**
 * /admin — owner-only analytics dashboard. Server-gated: a non-admin (or signed-
 * out) visitor gets a 404 via notFound(), so the page's existence isn't leaked.
 * The client component fetches /api/admin/analytics (gated identically).
 */
import { notFound } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUserId } from "@/lib/admin/access";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!isAdminUserId(data.user?.id)) notFound();
  return <AdminDashboard />;
}
