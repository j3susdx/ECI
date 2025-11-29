import { redirect } from "next/navigation";

export default function Page() {
  // Esto redirige inmediatamente a /login
  redirect("/login");
}