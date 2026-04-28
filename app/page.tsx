import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasSession = cookieStore.get("app_session")?.value === "valid";
  if (!hasSession) {
    redirect("/access");
  }
  return <AppShell />;
}
