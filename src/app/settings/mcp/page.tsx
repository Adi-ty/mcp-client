import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import McpSettingsClient from "./McpSettingsClient";

export default async function McpSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <McpSettingsClient
      user={{
        id: session.user.id!,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
    />
  );
}
