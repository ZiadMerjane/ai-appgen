import { redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import { getServerClient } from "@/lib/supabase/server";
import { getEntities } from "@/lib/spec";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return <AppShell entities={getEntities()}>{children}</AppShell>;
}
