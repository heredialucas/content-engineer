import { redirect } from "next/navigation";
import { hasSession } from "@/src/server/auth";
import Studio from "./studio";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await hasSession())) redirect("/login");
  return <Studio />;
}
