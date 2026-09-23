import { redirect } from "next/navigation";
import { hasSession } from "@/src/server/auth";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await hasSession()) redirect("/");
  return <LoginForm />;
}
