import { redirect } from "next/navigation";

export default function Home() {
  // Server-side redirect to the login page so visiting `/` shows the app login.
  redirect("/login");
  return null;
}
