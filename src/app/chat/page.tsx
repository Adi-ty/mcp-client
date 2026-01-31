import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatPageClient from "./ChatPageClient";

export default async function ChatPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <ChatPageClient user={session.user} />;
}
