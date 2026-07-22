import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, supabaseServerConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const mockEmail = cookieStore.get("cb_mock_session")?.value;

  if (!supabaseServerConfigured) {
    cookieStore.delete("cb_mock_session");
    redirect("/login");
  }

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Session may already be expired
  }

  redirect("/login");
}
